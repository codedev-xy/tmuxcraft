import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '@/i18n'
import { countPanes } from '@/core/layout-engine'
import { getActiveWindow } from '@/core/selectors'
import type { ChallengeGoal } from '@/game/level-types'
import { useGameStore } from '@/store/game-store'
import { useProgressStore } from '@/store/progress-store'
import { ChallengeScreen } from '../ChallengeScreen'

const twoPanes: ChallengeGoal = {
  description: 'Make two panes',
  targetState: {},
  optimalSteps: 1,
  validate: state => {
    const window = getActiveWindow(state)
    return window !== null && countPanes(window.layoutTree) === 2
  },
}

vi.mock('@/game/challenge/challenge-generator', () => ({ generateChallenge: () => twoPanes }))

function open() {
  const view = render(<ChallengeScreen />)
  return {
    user: userEvent.setup(),
    panes: () => view.container.querySelectorAll('[data-pane-id]'),
    commandBox: () => screen.getByRole<HTMLInputElement>('textbox', { name: 'command' }),
    commandCount: () => screen.getByTestId('command-count').textContent,
    records: () => useProgressStore.getState().challengeRecords,
  }
}

beforeAll(() => i18n.changeLanguage('en'))
beforeEach(() => {
  localStorage.clear()
  useProgressStore.getState().resetProgress()
})
afterEach(() => vi.useRealTimers())

describe('ChallengeScreen', () => {
  it('finishes and records the round when a typed command meets the goal', async () => {
    const { user, commandBox, commandCount, records } = open()
    await user.type(commandBox(), ':splt-window{Enter}')
    expect(commandCount()).toBe('0')
    await user.type(commandBox(), ':split-window{Enter}')
    expect(commandCount()).toBe('1')
    expect(screen.getByText(i18n.t('challenge.completed'))).toBeInTheDocument()
    expect(records()).toEqual([expect.objectContaining({ commandCount: 1, targetDescription: 'Make two panes' })])
    expect(commandBox()).toBeDisabled()
  })

  it('takes prefix keys', async () => {
    const { user, commandBox, panes, records } = open()
    await user.click(commandBox())
    await user.keyboard('{Control>}b{/Control}%')
    expect(panes()).toHaveLength(2)
    expect(records()).toHaveLength(1)
  })

  it('starts a fresh round on try again', async () => {
    const { user, commandBox, panes, commandCount } = open()
    await user.type(commandBox(), ':split-window{Enter}')
    await user.click(screen.getByRole('button', { name: /Try Again/ }))
    expect(panes()).toHaveLength(1)
    expect(commandCount()).toBe('0')
    expect(screen.queryByText(i18n.t('challenge.completed'))).not.toBeInTheDocument()
    expect(commandBox()).toBeEnabled()
  })

  it('stops taking input when the time runs out', () => {
    vi.useFakeTimers()
    const { commandBox, records } = open()
    act(() => { vi.advanceTimersByTime(60_000) })
    expect(screen.getByText(i18n.t('challenge.timeUp'))).toBeInTheDocument()
    expect(commandBox()).toBeDisabled()
    expect(records()).toHaveLength(0)
  })

  it('shows the result in a dialog on success, with a way back to the menu', async () => {
    const { user, commandBox } = open()
    await user.type(commandBox(), ':split-window{Enter}')
    const dialog = screen.getByRole('dialog', { name: i18n.t('challenge.completed') })
    expect(within(dialog).getByRole('button', { name: /Try Again/ })).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: i18n.t('challenge.backToMenu') }))
    expect(useGameStore.getState().currentScreen).toBe('challenge-select')
  })

  it('shows the time-up dialog, and both of its actions work', () => {
    vi.useFakeTimers()
    const { commandBox } = open()
    act(() => { vi.advanceTimersByTime(60_000) })
    const dialog = () => screen.getByRole('dialog', { name: i18n.t('challenge.timeUp') })
    fireEvent.click(within(dialog()).getByRole('button', { name: /Try Again/ }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(commandBox()).toBeEnabled()
    act(() => { vi.advanceTimersByTime(60_000) })
    fireEvent.click(within(dialog()).getByRole('button', { name: i18n.t('challenge.backToMenu') }))
    expect(useGameStore.getState().currentScreen).toBe('challenge-select')
  })

  it('counts down and warns in the last ten seconds', () => {
    vi.useFakeTimers()
    open()
    const timer = () => screen.getByRole('timer', { name: i18n.t('challenge.timeLeft') })
    expect(timer()).toHaveTextContent('1:00')
    expect(timer()).not.toHaveAttribute('data-tone', 'danger')
    act(() => { vi.advanceTimersByTime(50_000) })
    expect(timer()).toHaveTextContent('0:10')
    expect(timer()).toHaveAttribute('data-tone', 'danger')
  })

  it('has a named back button and the round goal on screen', async () => {
    const { user } = open()
    expect(screen.getByText('Make two panes')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: i18n.t('challenge.backToMenu') }))
    expect(useGameStore.getState().currentScreen).toBe('challenge-select')
  })
})
