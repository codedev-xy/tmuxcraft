import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '@/i18n'
import { ALL_LEVELS, STARS_PER_LEVEL } from '@/game/chapters'
import { useGameStore } from '@/store/game-store'
import { HomeScreen } from '../HomeScreen'
import { done, resetStores, setProgress } from './fixtures'

beforeAll(() => i18n.changeLanguage('en'))
afterAll(() => i18n.changeLanguage('en'))
beforeEach(resetStores)

describe('HomeScreen', () => {
  it('has one page heading', () => {
    render(<HomeScreen />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('gives every button a name', () => {
    render(<HomeScreen />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(7)
    buttons.forEach(button => expect(button).toHaveAccessibleName())
  })

  it('starts level 1-1 for a new player', async () => {
    render(<HomeScreen />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Start: 1-1 Meet tmux' }))
    expect(useGameStore.getState().currentLevel?.id).toBe('1-1')
    expect(useGameStore.getState().currentScreen).toBe('game')
  })

  it('continues with the first unfinished level', async () => {
    setProgress(done('1-1'), done('1-2'))
    render(<HomeScreen />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Continue: 1-3 Pane Navigation' }))
    expect(useGameStore.getState().currentLevel?.id).toBe('1-3')
    expect(useGameStore.getState().currentScreen).toBe('game')
  })

  it('leads to the chapter list once every level is complete', async () => {
    setProgress(...ALL_LEVELS.map(level => done(level.id)))
    render(<HomeScreen />)
    await userEvent.setup().click(screen.getByRole('button', { name: /all levels complete/i }))
    expect(useGameStore.getState().currentLevel).toBeNull()
    expect(useGameStore.getState().currentScreen).toBe('chapter-select')
  })

  it.each([
    [/learning mode/i, 'chapter-select'],
    [/challenge mode/i, 'challenge-select'],
    [/command reference/i, 'reference'],
    [/settings/i, 'settings'],
  ] as const)('opens %s', async (name, target) => {
    render(<HomeScreen />)
    await userEvent.setup().click(screen.getByRole('button', { name }))
    expect(useGameStore.getState().currentScreen).toBe(target)
  })

  it('shows the overall progress', () => {
    setProgress(done('1-1', 3), done('1-2', 2), done('2-1', 1))
    render(<HomeScreen />)
    expect(screen.getByText(`3/${ALL_LEVELS.length} levels completed`)).toBeInTheDocument()
    expect(screen.getByText(`6 / ${ALL_LEVELS.length * STARS_PER_LEVEL} stars`)).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Overall progress' }))
      .toHaveAttribute('aria-valuenow', String(Math.round((3 / ALL_LEVELS.length) * 100)))
  })

  it('switches the language', async () => {
    render(<HomeScreen />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '中文' }))
    expect(i18n.language).toBe('zh')
    await user.click(screen.getByRole('button', { name: 'EN' }))
    expect(i18n.language).toBe('en')
    expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true')
  })
})
