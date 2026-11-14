import { describe, it, expect } from 'vitest'
import { countPanes } from '@/core/layout-engine'
import { getActiveSession, getActiveWindow } from '@/core/selectors'
import { defaultState, emptyState } from '@/core/state'
import type { TmuxState } from '@/core/types'
import { appendPaneLines } from '@/core/update'
import { applyInput, simulate } from '../simulate'
import type { PlayerInput } from '../simulate'

const line = (text: string): PlayerInput => ({ type: 'line', text })
const key = (name: string): PlayerInput => ({ type: 'key', key: name })
const keys = (...names: string[]): PlayerInput[] => names.map(key)

const panes = (state: TmuxState) => countPanes(getActiveWindow(state)!.layoutTree)
const mouseOn = (): TmuxState => simulate(defaultState(), [line(':set -g mouse on'), line(':split-window -h')]).state

describe('applyInput', () => {
  it('runs a typed line and counts it', () => {
    const result = applyInput(defaultState(), line(':split-window'))
    expect(result).toMatchObject({ ok: true, handled: true, counted: true })
    expect(panes(result.state)).toBe(2)
  })

  it('counts a shell line once, however many tmux commands it ran', () => {
    const run = simulate(defaultState(), [line('tmux split-window -h && tmux split-window')])
    expect(panes(run.state)).toBe(3)
    expect(run.steps).toBe(1)
  })

  it('does not count an empty line', () => {
    const state = defaultState()
    expect(applyInput(state, line('   '))).toMatchObject({ state, ok: true, counted: false })
  })

  it('does not count a tmux command that failed', () => {
    const result = applyInput(defaultState(), line(':select-window -t 99'))
    expect(result).toMatchObject({ ok: false, counted: false })
    expect(result.errors[0].code).toBe('target.windowNotFound')
  })

  it('does not count a mistyped shell line', () => {
    const result = applyInput(defaultState(), line('tmx ls'))
    expect(result).toMatchObject({ ok: false, counted: false })
  })

  it('counts a line that changed tmux before it failed', () => {
    const result = applyInput(defaultState(), line(':split-window ; select-window -t 99'))
    expect(result.ok).toBe(false)
    expect(panes(result.state)).toBe(2)
    expect(result.counted).toBe(true)
  })

  it('hands back output lines', () => {
    expect(applyInput(defaultState(), line(':list-panes')).output).toHaveLength(1)
  })

  it('types at the terminal outside while detached', () => {
    const result = applyInput(emptyState(), line('tmux new -s dev'))
    expect(result.counted).toBe(true)
    expect(getActiveSession(result.state)?.name).toBe('dev')
  })
})

describe('keys', () => {
  it('does not count the prefix key, and counts the binding after it', () => {
    const prefix = applyInput(defaultState(), key('C-b'))
    expect(prefix).toMatchObject({ handled: true, counted: false })
    expect(prefix.state.prefixPending).toBe(true)
    const bound = applyInput(prefix.state, key('%'))
    expect(bound).toMatchObject({ handled: true, counted: true })
    expect(panes(bound.state)).toBe(2)
  })

  it('leaves a key that is not tmux\'s unhandled and uncounted', () => {
    const state = defaultState()
    expect(applyInput(state, key('a'))).toMatchObject({ state, handled: false, counted: false })
  })

  it('reports an unbound key without counting it', () => {
    const run = simulate(defaultState(), keys('C-b', 'Q'))
    expect(run.steps).toBe(0)
    expect(run.results[1].errors[0].code).toBe('key.unbound')
  })

  it('counts a rename through the prompt as one step', () => {
    const opened = simulate(defaultState(), keys('C-b', ','))
    expect(opened.steps).toBe(0)
    expect(opened.state.prompt).not.toBeNull()
    const renamed = applyInput(opened.state, { type: 'prompt', text: 'editor' })
    expect(renamed.counted).toBe(true)
    expect(renamed.state.prompt).toBeNull()
    expect(getActiveWindow(renamed.state)?.name).toBe('editor')
  })

  it('does not count a prompt closed with nothing typed', () => {
    const opened = simulate(defaultState(), keys('C-b', ':'))
    const closed = applyInput(opened.state, { type: 'prompt', text: '' })
    expect(closed).toMatchObject({ ok: true, counted: false })
    expect(closed.state.prompt).toBeNull()
  })

  it('counts a confirmed kill as one step, and neither the question nor a no', () => {
    const asked = simulate(defaultState(), [line(':split-window'), ...keys('C-b', 'x')])
    expect(asked.steps).toBe(1)
    expect(asked.state.prompt).toMatchObject({ confirm: true })
    const declined = applyInput(asked.state, { type: 'prompt', text: 'n' })
    expect(declined).toMatchObject({ ok: true, handled: true, counted: false })
    expect(panes(declined.state)).toBe(2)
    const confirmed = applyInput(asked.state, { type: 'prompt', text: 'y' })
    expect(confirmed).toMatchObject({ ok: true, handled: true, counted: true })
    expect(panes(confirmed.state)).toBe(1)
  })

  it('does not count confirm-before typed at the : prompt until it is answered', () => {
    const run = simulate(defaultState(), [line(':split-window'), line(':confirm-before kill-pane'), { type: 'prompt', text: 'y' }])
    expect(run.results.map(result => result.counted)).toEqual([true, false, true])
    expect(panes(run.state)).toBe(1)
  })

  it('counts copying, not moving the cursor', () => {
    const start = appendPaneLines(defaultState(), 'p1', ['hello world'])
    const run = simulate(start, keys('C-b', '[', '0', 'Space', '$', 'Enter'))
    expect(run.state.clipboard).toBe('hello world')
    expect(run.results.map(result => result.counted)).toEqual([false, true, false, false, false, true])
    expect(run.steps).toBe(2)
  })
})

describe('mouse and editor', () => {
  it('counts a click that selected another pane', () => {
    const result = applyInput(mouseOn(), { type: 'click', paneId: 'p1' })
    expect(result).toMatchObject({ handled: true, counted: true })
    expect(getActiveWindow(result.state)?.activePaneId).toBe('p1')
  })

  it('ignores a click while the mouse is off', () => {
    const state = simulate(defaultState(), [line(':split-window -h')]).state
    expect(applyInput(state, { type: 'click', paneId: 'p1' })).toMatchObject({ state, handled: false, counted: false })
  })

  it('counts a border drag', () => {
    const result = applyInput(mouseOn(), { type: 'drag', paneId: 'p1', direction: 'right', cells: 10 })
    expect(result.counted).toBe(true)
    expect(getActiveWindow(result.state)?.layoutTree.ratio).toBeCloseTo(0.6)
  })

  it('counts saving a file', () => {
    const result = applyInput(defaultState(), { type: 'save', path: '.tmux.conf', text: 'set -g mouse on\n' })
    expect(result).toMatchObject({ ok: true, handled: true, counted: true })
    expect(result.state.files['~/.tmux.conf']).toBe('set -g mouse on\n')
  })
})

describe('simulate', () => {
  it('runs inputs in order and keeps every result', () => {
    const run = simulate(defaultState(), [line(':new-window -n server'), ...keys('C-b', '"'), line('bogus')])
    expect(run.results).toHaveLength(4)
    expect(run.steps).toBe(2)
    expect(getActiveWindow(run.state)?.name).toBe('server')
    expect(panes(run.state)).toBe(2)
  })

  it('does not change the state it was given', () => {
    const state = defaultState()
    const before = JSON.stringify(state)
    simulate(state, [line(':split-window'), ...keys('C-b', 'c')])
    expect(JSON.stringify(state)).toBe(before)
  })
})
