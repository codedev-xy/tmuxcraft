import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '@/i18n'
import { countPanes } from '@/core/layout-engine'
import { getActiveWindow } from '@/core/selectors'
import type { ChallengeDifficulty, ChallengeGoal, ChallengeTask } from '@/game/level-types'
import { useGameStore } from '@/store/game-store'
import { useProgressStore } from '@/store/progress-store'
import { ChallengeScreen } from '../ChallengeScreen'

const { generate } = vi.hoisted(() => ({ generate: vi.fn() }))

vi.mock('@/game/challenge/challenge-generator', async importOriginal => ({
  ...(await importOriginal<typeof import('@/game/challenge/challenge-generator')>()),
  generateChallenge: generate,
}))

const panesTask = (count: number): ChallengeTask => ({
  id: `panes-${count}`,
  key: 'challenge.tasks.testPanes',
  params: { count },
  validate: state => {
    const window = getActiveWindow(state)
    return window !== null && countPanes(window.layoutTree) === count
  },
})

const namedTask: ChallengeTask = {
  id: 'named',
  key: 'challenge.tasks.testNamed',
  params: { name: 'logs' },
  validate: state => getActiveWindow(state)?.name === 'logs',
}

const goalOf = (...tasks: ChallengeTask[]) => (difficulty: ChallengeDifficulty): ChallengeGoal => ({ difficulty, tasks, solution: [] })

function open(difficulty: ChallengeDifficulty = 'beginner') {
  useGameStore.getState().startChallenge(difficulty)
  const view = render(<ChallengeScreen />)
  return {
    user: userEvent.setup(),
    panes: () => view.container.querySelectorAll('[data-pane-id]'),
    commandBox: () => screen.getByRole<HTMLInputElement>('textbox', { name: 'command' }),
    commandCount: () => screen.getByTestId('command-count').textContent,
    records: () => useProgressStore.getState().challengeRecords,
    timer: () => screen.getByRole('timer', { name: i18n.t('challenge.timeLeft') }),
  }
}

const seconds = (count: number) => act(() => { vi.advanceTimersByTime(count * 1000) })

/** Runs a command line without user-event, which cannot be used under fake timers. */
function submit(box: HTMLInputElement, text: string) {
  fireEvent.change(box, { target: { value: text } })
  fireEvent.keyDown(box, { key: 'Enter' })
}

beforeAll(async () => {
  await i18n.changeLanguage('en')
  i18n.addResource('en', 'translation', 'challenge.tasks.testPanes', 'Make {{count}} panes')
  i18n.addResource('en', 'translation', 'challenge.tasks.testNamed', 'Name the window “{{name}}”')
})
beforeEach(() => {
  localStorage.clear()
  useProgressStore.getState().resetProgress()
  generate.mockReset()
  generate.mockImplementation(goalOf(panesTask(2)))
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
    expect(records()).toEqual([{ difficulty: 'beginner', commandCount: 1, timeSeconds: 0, completedAt: expect.any(String) }])
    expect(commandBox()).toBeDisabled()
  })

  it('takes prefix keys', async () => {
    const { user, commandBox, panes, records } = open()
    await user.click(commandBox())
    await user.keyboard('{Control>}b{/Control}%')
    expect(panes()).toHaveLength(2)
    expect(records()).toHaveLength(1)
  })

  it('starts a fresh round with a new goal on try again', async () => {
    const { user, commandBox, panes, commandCount } = open()
    await user.type(commandBox(), ':split-window{Enter}')
    await user.click(screen.getByRole('button', { name: /Try Again/ }))
    expect(generate).toHaveBeenCalledTimes(2)
    expect(panes()).toHaveLength(1)
    expect(commandCount()).toBe('0')
    expect(screen.queryByText(i18n.t('challenge.completed'))).not.toBeInTheDocument()
    expect(commandBox()).toBeEnabled()
  })

  it.each([
    ['beginner', 60, '1:00', 'Beginner'],
    ['intermediate', 90, '1:30', 'Intermediate'],
    ['advanced', 120, '2:00', 'Advanced'],
  ] as const)('plays the %s challenge against its own %i second clock', (difficulty, limit, shown, name) => {
    vi.useFakeTimers()
    const { commandBox, records, timer } = open(difficulty)
    expect(generate).toHaveBeenCalledWith(difficulty)
    expect(screen.getByRole('banner')).toHaveTextContent(name)
    expect(timer()).toHaveTextContent(shown)
    seconds(limit - 1)
    expect(timer()).toHaveTextContent('0:01')
    expect(commandBox()).toBeEnabled()
    seconds(1)
    expect(screen.getByText(i18n.t('challenge.timeUp'))).toBeInTheDocument()
    expect(commandBox()).toBeDisabled()
    expect(records()).toHaveLength(0)
  })

  it('records the difficulty and the time the round took', () => {
    vi.useFakeTimers()
    const { commandBox, records } = open('advanced')
    seconds(42)
    submit(commandBox(), ':split-window')
    expect(records()).toEqual([expect.objectContaining({ difficulty: 'advanced', timeSeconds: 42, commandCount: 1 })])
  })

  it('shows the result in a dialog on success, with a way back to the menu', async () => {
    const { user, commandBox } = open()
    await user.type(commandBox(), ':split-window{Enter}')
    const dialog = screen.getByRole('dialog', { name: i18n.t('challenge.completed') })
    expect(within(dialog).getByRole('button', { name: /Try Again/ })).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: i18n.t('challenge.backToMenu') }))
    expect(useGameStore.getState().currentScreen).toBe('challenge-select')
  })

  it('says so when the round beats the best one so far, and only then', async () => {
    const { user, commandBox, records } = open()
    await user.type(commandBox(), ':split-window{Enter}')
    expect(screen.getByRole('dialog')).toHaveTextContent(i18n.t('challenge.newBest'))
    await user.click(screen.getByRole('button', { name: /Try Again/ }))
    await user.type(commandBox(), ':split-window{Enter}')
    expect(records()).toHaveLength(2)
    expect(screen.getByRole('dialog')).not.toHaveTextContent(i18n.t('challenge.newBest'))
  })

  it('shows the time-up dialog, and both of its actions work', () => {
    vi.useFakeTimers()
    const { commandBox } = open()
    seconds(60)
    const dialog = () => screen.getByRole('dialog', { name: i18n.t('challenge.timeUp') })
    fireEvent.click(within(dialog()).getByRole('button', { name: /Try Again/ }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(commandBox()).toBeEnabled()
    seconds(60)
    fireEvent.click(within(dialog()).getByRole('button', { name: i18n.t('challenge.backToMenu') }))
    expect(useGameStore.getState().currentScreen).toBe('challenge-select')
  })

  it('counts down and warns in the last ten seconds', () => {
    vi.useFakeTimers()
    const { timer } = open()
    expect(timer()).toHaveTextContent('1:00')
    expect(timer()).not.toHaveAttribute('data-tone', 'danger')
    seconds(50)
    expect(timer()).toHaveTextContent('0:10')
    expect(timer()).toHaveAttribute('data-tone', 'danger')
  })

  it('lists the tasks of the goal in the language on screen and ticks them as they are done', async () => {
    generate.mockImplementation(goalOf(panesTask(2), namedTask))
    const { user, commandBox, records } = open()
    const goal = within(screen.getByRole('complementary', { name: i18n.t('challenge.goal') }))
    const task = (text: string) => goal.getByText(text).closest('li')!
    expect(task('Make 2 panes')).toHaveAttribute('data-done', 'false')
    expect(task('Name the window “logs”')).toHaveAttribute('data-done', 'false')
    await user.type(commandBox(), ':split-window{Enter}')
    expect(task('Make 2 panes')).toHaveAttribute('data-done', 'true')
    expect(task('Name the window “logs”')).toHaveAttribute('data-done', 'false')
    expect(records()).toHaveLength(0)
    await user.type(commandBox(), ':rename-window logs{Enter}')
    expect(records()).toHaveLength(1)
  })

  it('shows what was still missing when the time ran out', () => {
    generate.mockImplementation(goalOf(panesTask(2), namedTask))
    vi.useFakeTimers()
    const { commandBox } = open()
    submit(commandBox(), ':split-window')
    seconds(60)
    const dialog = within(screen.getByRole('dialog', { name: i18n.t('challenge.timeUp') }))
    expect(dialog.getByText('Make 2 panes').closest('li')).toHaveAttribute('data-done', 'true')
    expect(dialog.getByText('Name the window “logs”').closest('li')).toHaveAttribute('data-done', 'false')
  })

  it('has a named back button', async () => {
    const { user } = open()
    await user.click(screen.getByRole('button', { name: i18n.t('challenge.backToMenu') }))
    expect(useGameStore.getState().currentScreen).toBe('challenge-select')
  })
})
