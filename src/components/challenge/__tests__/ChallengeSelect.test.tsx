import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '@/i18n'
import type { ChallengeRecord } from '@/game/level-types'
import { useGameStore } from '@/store/game-store'
import { useProgressStore } from '@/store/progress-store'
import { ChallengeSelect } from '../ChallengeSelect'

beforeAll(() => i18n.changeLanguage('en'))
beforeEach(() => {
  useGameStore.setState(useGameStore.getInitialState())
  useGameStore.getState().setScreen('challenge-select')
  useProgressStore.getState().resetProgress()
})

const record = (difficulty: ChallengeRecord['difficulty'], timeSeconds: number, commandCount: number): ChallengeRecord => ({
  difficulty,
  timeSeconds,
  commandCount,
  completedAt: '2026-01-01T00:00:00.000Z',
})

describe('ChallengeSelect', () => {
  it('offers the three difficulties with their time limits', () => {
    render(<ChallengeSelect />)
    expect(screen.getByRole('heading', { level: 1, name: /Challenge Mode/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Beginner.*60s time limit/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Intermediate.*90s time limit/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Advanced.*120s time limit/ })).toBeInTheDocument()
  })

  it('shows what each difficulty asks for', () => {
    render(<ChallengeSelect />)
    for (const difficulty of ['beginner', 'intermediate', 'advanced']) {
      expect(screen.getByText(i18n.t(`challenge.${difficulty}Desc`))).toBeInTheDocument()
    }
  })

  it.each([
    ['Beginner', 'beginner'],
    ['Intermediate', 'intermediate'],
    ['Advanced', 'advanced'],
  ])('starts the %s challenge at that difficulty', async (name, difficulty) => {
    const user = userEvent.setup()
    render(<ChallengeSelect />)
    await user.click(screen.getByRole('button', { name: new RegExp(`^${name}`) }))
    expect(useGameStore.getState().currentScreen).toBe('challenge')
    expect(useGameStore.getState().challengeDifficulty).toBe(difficulty)
  })

  it('shows the best round of each difficulty, or that there is none yet', () => {
    const { addChallengeRecord } = useProgressStore.getState()
    addChallengeRecord(record('beginner', 44, 8))
    addChallengeRecord(record('beginner', 31, 6))
    addChallengeRecord(record('advanced', 97, 1))
    render(<ChallengeSelect />)
    expect(screen.getByRole('button', { name: /^Beginner/ })).toHaveTextContent('Best: 31s with 6 commands')
    expect(screen.getByRole('button', { name: /^Intermediate/ })).toHaveTextContent('Not finished yet')
    expect(screen.getByRole('button', { name: /^Advanced/ })).toHaveTextContent('Best: 97s with 1 command')
    expect(screen.getByRole('button', { name: /^Advanced/ })).not.toHaveTextContent('1 commands')
  })

  it('goes back home', async () => {
    const user = userEvent.setup()
    render(<ChallengeSelect />)
    await user.click(screen.getByRole('button', { name: /Back/ }))
    expect(useGameStore.getState().currentScreen).toBe('home')
  })
})
