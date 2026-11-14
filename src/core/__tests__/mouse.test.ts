import { describe, it, expect } from 'vitest'
import { clickPane, dragBorder } from '../mouse'
import { OPTION_COMMANDS } from '../commands/options'
import { PANE_COMMANDS } from '../commands/pane'
import { getActiveWindow } from '../selectors'
import type { TmuxState } from '../types'
import { runLines, testEngine } from './harness'
import { twoSessionState } from './fixtures'

const ENGINE = testEngine([...OPTION_COMMANDS, ...PANE_COMMANDS])

function mouseOn(): TmuxState {
  return runLines(ENGINE, twoSessionState(), ['set -g mouse on'])
}

function firstRatio(state: TmuxState): number | undefined {
  return getActiveWindow(state)?.layoutTree.ratio
}

describe('clickPane', () => {
  it('selects the clicked pane when mouse is on', () => {
    const result = clickPane(mouseOn(), 'p2', ENGINE)
    expect(result.handled).toBe(true)
    expect(result.ok).toBe(true)
    expect(getActiveWindow(result.state)?.activePaneId).toBe('p2')
  })

  it('logs the selection with origin mouse', () => {
    const entry = clickPane(mouseOn(), 'p2', ENGINE).state.log.at(-1)
    expect(entry).toMatchObject({ name: 'select-pane', origin: 'mouse', detail: { pane: 'p2' } })
  })

  it('does nothing while mouse is off', () => {
    const state = twoSessionState()
    const result = clickPane(state, 'p2', ENGINE)
    expect(result.handled).toBe(false)
    expect(result.state).toBe(state)
  })

  it('does nothing while detached', () => {
    const state = { ...mouseOn(), isDetached: true }
    expect(clickPane(state, 'p2', ENGINE)).toMatchObject({ handled: false, state })
  })

  it('does nothing while the editor is open', () => {
    const state = { ...mouseOn(), editing: '~/.tmux.conf' }
    expect(clickPane(state, 'p2', ENGINE)).toMatchObject({ handled: false, state })
  })

  it('ignores a pane that is not in the window on screen', () => {
    const state = mouseOn()
    const result = clickPane(state, 'p3', ENGINE)
    expect(result.handled).toBe(false)
    expect(result.state).toBe(state)
  })

  it('does not log a click on the pane that is already active', () => {
    const state = mouseOn()
    const result = clickPane(state, 'p1', ENGINE)
    expect(result.handled).toBe(true)
    expect(result.state).toBe(state)
  })
})

describe('dragBorder', () => {
  it('resizes the pane by the dragged cells with origin mouse', () => {
    const result = dragBorder(mouseOn(), 'p1', 'right', 8, ENGINE)
    expect(result.ok).toBe(true)
    expect(firstRatio(result.state)).toBeCloseTo(0.58)
    expect(result.state.log.at(-1)).toMatchObject({ name: 'resize-pane', origin: 'mouse' })
  })

  it('keeps the active pane where it was', () => {
    const result = dragBorder(mouseOn(), 'p2', 'left', 5, ENGINE)
    expect(getActiveWindow(result.state)?.activePaneId).toBe('p1')
    expect(firstRatio(result.state)).toBeCloseTo(0.45)
  })

  it('does nothing while mouse is off', () => {
    const state = twoSessionState()
    expect(dragBorder(state, 'p1', 'right', 8, ENGINE)).toMatchObject({ handled: false, state })
  })

  it('does nothing for a drag of no cells', () => {
    const state = mouseOn()
    expect(dragBorder(state, 'p1', 'right', 0, ENGINE)).toMatchObject({ handled: true, state })
  })
})
