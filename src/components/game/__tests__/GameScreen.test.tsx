import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
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

function play(id: string | LevelDefinition) {
  act(() => useGameStore.getState().startLevel(typeof id === 'string' ? level(id) : id))
  const view = render(<GameScreen />)
  return {
    user: userEvent.setup(),
    panes: () => view.container.querySelectorAll('[data-pane-id]'),
    commandBox: () => screen.getByRole<HTMLInputElement>('textbox', { name: 'command' }),
    game: () => useGameStore.getState(),
  }
}

const plain = (key: string) => i18n.t(key).replace(/`/g, '')
const hintButton = () => screen.getByRole('button', { name: new RegExp(i18n.t('game.showHint')) })
const hintList = () => screen.queryByRole('list', { name: i18n.t('game.hint') })
const shownHints = () => {
  const list = hintList()
  return list ? within(list).getAllByRole('listitem').map(item => item.textContent) : []
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

describe('GameScreen header', () => {
  it('names the level in the page heading', () => {
    play('1-2')
    expect(screen.getByRole('heading', { level: 1, name: i18n.t('levels.1-2.title') })).toBeInTheDocument()
  })

  it('goes back to the level list from a named back button', async () => {
    const { user, game } = play('1-2')
    await user.click(screen.getByRole('button', { name: i18n.t('game.backToLevels') }))
    expect(game().currentScreen).toBe('level-select')
  })

  it('tells how many objectives are done in words as well as dots', async () => {
    const { user, commandBox } = play('1-2')
    expect(screen.getByRole('img', { name: i18n.t('game.objectivesDone', { done: 0, total: 3 }) })).toBeInTheDocument()
    await user.type(commandBox(), ':split-window -h{Enter}')
    expect(screen.getByRole('img', { name: i18n.t('game.objectivesDone', { done: 1, total: 3 }) })).toBeInTheDocument()
  })
})

describe('GameScreen hints', () => {
  it('shows no hint until the player asks, and says what a hint costs', () => {
    play('1-2')
    const text = document.body.textContent
    for (const n of [1, 2, 3]) expect(text).not.toContain(plain(`game.hints.1-2-${n}`))
    expect(screen.getByText(i18n.t('game.hintCost'))).toBeInTheDocument()
    expect(hintList()).toBeNull()
  })

  it('reveals the hints one by one, keeps them listed, and counts each in the store', async () => {
    const { user, game } = play('1-2')
    expect(hintButton()).toHaveAccessibleName(new RegExp(i18n.t('game.hintsRemaining', { count: 3 })))
    for (const n of [1, 2, 3]) {
      await user.click(hintButton())
      expect(game().hintsUsed).toBe(n)
      expect(shownHints()).toEqual([1, 2, 3].slice(0, n).map(k => plain(`game.hints.1-2-${k}`)))
      expect(hintButton()).toHaveAccessibleName(new RegExp(i18n.t('game.hintsRemaining', { count: 3 - n })))
    }
    expect(hintButton()).toBeDisabled()
    expect(screen.queryByText(i18n.t('game.hintCost'))).not.toBeInTheDocument()
  })

  it('costs the no-hints star once a hint was revealed', async () => {
    const { user, commandBox } = play('1-1')
    await user.click(hintButton())
    await user.type(commandBox(), 'tmux new -s work{Enter}')
    expect(useProgressStore.getState().levelProgress['1-1'].stars).toEqual({ completed: true, efficient: true, noHints: false })
  })

  it('stops giving hints once the level is complete', async () => {
    const { user, commandBox } = play('1-1')
    await user.type(commandBox(), 'tmux new -s work{Enter}')
    expect(hintButton()).toBeDisabled()
  })
})

describe('GameScreen level complete dialog', () => {
  async function finish(id: string | LevelDefinition = '1-1') {
    const game = play(id)
    await game.user.type(game.commandBox(), 'tmux new -s work{Enter}')
    return { ...game, dialog: () => screen.getByRole('dialog', { name: i18n.t('game.levelComplete') }) }
  }

  it('is a dialog that shows the stars and puts the focus on the next level', async () => {
    const { dialog } = await finish()
    expect(within(dialog()).getByRole('img', { name: i18n.t('common.starsEarned', { count: 3 }) })).toBeInTheDocument()
    for (const star of ['completed', 'efficient', 'noHints']) {
      expect(within(dialog()).getByText(i18n.t(`game.stars.${star}`))).toBeInTheDocument()
    }
    expect(within(dialog()).getByRole('button', { name: new RegExp(i18n.t('game.nextLevel')) })).toHaveFocus()
  })

  it('starts the following level', async () => {
    const { user, game, panes } = await finish()
    await user.click(screen.getByRole('button', { name: new RegExp(i18n.t('game.nextLevel')) }))
    expect(game().currentLevel?.id).toBe('1-2')
    expect(game().isLevelComplete).toBe(false)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(panes()).toHaveLength(1)
  })

  it('goes back to the level list', async () => {
    const { user, game, dialog } = await finish()
    await user.click(within(dialog()).getByRole('button', { name: i18n.t('game.backToLevels') }))
    expect(game().currentScreen).toBe('level-select')
  })

  it('plays the level again', async () => {
    const { user, game, dialog, commandBox } = await finish()
    await user.click(within(dialog()).getByRole('button', { name: /Retry/ }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(game().commandCount).toBe(0)
    expect(commandBox()).toBeEnabled()
  })

  it('has no next level after the last one', async () => {
    const { dialog } = await finish({ ...level('1-1'), id: '3-7' })
    expect(within(dialog()).queryByRole('button', { name: new RegExp(i18n.t('game.nextLevel')) })).not.toBeInTheDocument()
    expect(within(dialog()).getByText(i18n.t('game.allLevelsComplete'))).toBeInTheDocument()
    expect(within(dialog()).getByRole('button', { name: i18n.t('game.backToLevels') })).toHaveFocus()
  })
})

describe('GameScreen quick reference', () => {
  const openReference = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole('button', { name: i18n.t('game.quickReference') }))
    return screen.getByRole('dialog', { name: i18n.t('game.quickReference') })
  }

  it('opens with a search box and closes on Escape', async () => {
    const { user } = play('1-2')
    const dialog = await openReference(user)
    expect(within(dialog).getByRole('searchbox', { name: i18n.t('game.searchCommands') })).toBeInTheDocument()
    expect(within(dialog).getByTestId('reference-list')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps tmux keys away from the terminal while open', async () => {
    const { user, panes, game } = play('1-2')
    await openReference(user)
    await user.keyboard('{Control>}b{/Control}%')
    expect(panes()).toHaveLength(1)
    expect(game().commandCount).toBe(0)
    await user.keyboard('{Escape}')
    await user.keyboard('{Control>}b{/Control}%')
    expect(panes()).toHaveLength(2)
  })
})
