import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '@/i18n'
import { formatError } from '@/i18n/format-error'
import { applyInput } from '@/game/sim/simulate'
import { chapter1Levels } from '@/game/levels/chapter1'
import type { LevelDefinition } from '@/game/level-types'
import { useGameStore } from '@/store/game-store'
import { useProgressStore } from '@/store/progress-store'
import { GameScreen } from '../GameScreen'

const level = (id: string): LevelDefinition => chapter1Levels.find(candidate => candidate.id === id)!

function play(id: string) {
  act(() => useGameStore.getState().startLevel(level(id)))
  const view = render(<GameScreen />)
  return {
    user: userEvent.setup(),
    panes: () => view.container.querySelectorAll('[data-pane-id]'),
    commandBox: () => screen.getByRole<HTMLInputElement>('textbox', { name: 'command' }),
    game: () => useGameStore.getState(),
  }
}

beforeAll(() => i18n.changeLanguage('en'))
beforeEach(() => {
  localStorage.clear()
  useProgressStore.getState().resetProgress()
})

describe('GameScreen', () => {
  it('completes a level once its objectives are met and saves the result', async () => {
    const { user, commandBox, game } = play('1-1')
    await user.type(commandBox(), 'tmux new -s work{Enter}')
    expect(game().isLevelComplete).toBe(true)
    expect(game().commandCount).toBe(1)
    expect(useProgressStore.getState().levelProgress['1-1']).toMatchObject({ completed: true, bestCommandCount: 1 })
    expect(screen.getByText(i18n.t('game.levelComplete'))).toBeInTheDocument()
    expect(commandBox()).toBeDisabled()
  })

  it('does not count a line tmux refused, and says why in the player\'s language', async () => {
    const { user, commandBox, game, panes } = play('1-2')
    await user.type(commandBox(), ':splt-window{Enter}')
    const [error] = applyInput(level('1-2').initialState, { type: 'line', text: ':splt-window' }).errors
    expect(game().commandCount).toBe(0)
    expect(screen.getAllByText(formatError(i18n.t, error))).toHaveLength(2)
    await user.type(commandBox(), ':split-window{Enter}')
    expect(game().commandCount).toBe(1)
    expect(panes()).toHaveLength(2)
    expect(screen.getAllByText(formatError(i18n.t, error))).toHaveLength(1)
  })

  it('counts a command run with the prefix key', async () => {
    const { user, commandBox, game, panes } = play('1-2')
    await user.click(commandBox())
    await user.keyboard('{Control>}b{/Control}%')
    expect(panes()).toHaveLength(2)
    expect(game().commandCount).toBe(1)
    expect(game().comboCount).toBe(1)
    expect(commandBox()).toHaveValue('')
  })

  it('starts the level over on retry', async () => {
    const { user, commandBox, game, panes } = play('1-2')
    await user.type(commandBox(), ':split-window{Enter}')
    await user.click(screen.getByRole('button', { name: /Retry/ }))
    expect(panes()).toHaveLength(1)
    expect(game().commandCount).toBe(0)
    expect(screen.queryByText(':split-window')).not.toBeInTheDocument()
    expect(commandBox()).toHaveFocus()
  })

  it('opens the next level with its own terminal', async () => {
    const { user, commandBox, panes } = play('1-2')
    await user.type(commandBox(), ':split-window{Enter}')
    act(() => useGameStore.getState().startLevel(level('1-3')))
    expect(panes()).toHaveLength(4)
    expect(screen.queryByText(':split-window')).not.toBeInTheDocument()
  })
})
