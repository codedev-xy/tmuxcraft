import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '@/i18n'
import { useGameStore } from '@/store/game-store'
import { ChallengeSelect } from '../ChallengeSelect'

beforeAll(() => i18n.changeLanguage('en'))
beforeEach(() => useGameStore.getState().setScreen('challenge-select'))

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
    expect(screen.getByText('Random layouts with basic commands')).toBeInTheDocument()
  })

  it.each(['Beginner', 'Intermediate', 'Advanced'])('starts the challenge from %s', async name => {
    const user = userEvent.setup()
    render(<ChallengeSelect />)
    await user.click(screen.getByRole('button', { name: new RegExp(`^${name}`) }))
    expect(useGameStore.getState().currentScreen).toBe('challenge')
  })

  it('goes back home', async () => {
    const user = userEvent.setup()
    render(<ChallengeSelect />)
    await user.click(screen.getByRole('button', { name: /Back/ }))
    expect(useGameStore.getState().currentScreen).toBe('home')
  })
})
