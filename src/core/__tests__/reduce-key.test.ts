import { describe, it, expect } from 'vitest'
import { reduceKey } from '../reduce-key'
import { ENGINE } from '../engine'
import { findPane, getActiveWindow } from '../selectors'
import type { KeyId, TmuxState } from '../types'
import { appendPaneLines } from '../update'
import { must, runLines } from './harness'
import { twoSessionState } from './fixtures'

/** Presses keys in order; every press must be handled and succeed. */
function press(state: TmuxState, ...keys: KeyId[]): TmuxState {
  return keys.reduce((current, key) => {
    const result = reduceKey(current, key, ENGINE)
    expect(result.handled).toBe(true)
    return must(result).state
  }, state)
}

function withText(): TmuxState {
  return appendPaneLines(twoSessionState(), 'p1', ['hello world'])
}

describe('reduceKey', () => {
  it('runs a prefix binding', () => {
    const state = press(twoSessionState(), 'C-b', 'c')
    expect(state.sessions[0].windows).toHaveLength(3)
    expect(state.log.at(-1)).toMatchObject({ name: 'new-window', origin: 'key', key: 'c' })
  })

  it('leaves a plain key to the caller', () => {
    const state = twoSessionState()
    expect(reduceKey(state, 'a', ENGINE)).toMatchObject({ handled: false, state })
  })

  it('enters copy mode with the prefix and [', () => {
    const state = press(withText(), 'C-b', '[')
    expect(state.copyMode).toEqual({ paneId: 'p1', cursor: { row: 0, col: 0 }, anchor: null })
  })

  it('gives keys to copy mode while the pane on screen is in it', () => {
    const state = press(withText(), 'C-b', '[', 'Right', 'Right')
    expect(state.copyMode?.cursor).toEqual({ row: 0, col: 2 })
  })

  it('copies a selection and pastes it into another pane', () => {
    const copied = press(withText(), 'C-b', '[', 'Space', 'Right', 'Right', 'Right', 'Right', 'Enter')
    expect(copied.copyMode).toBeNull()
    expect(copied.clipboard).toBe('hello')
    const pasted = press(copied, 'C-b', 'Right', 'C-b', ']')
    expect(findPane(pasted, 'p2')?.input).toBe('hello')
    expect(pasted.log.map(entry => entry.name)).toEqual(['copy-mode', 'copy-selection', 'select-pane', 'paste-buffer'])
  })

  it('swallows plain keys in copy mode instead of passing them to the shell', () => {
    const copying = press(withText(), 'C-b', '[', 'Right')
    for (const key of ['a', 'x', '%', 'Space', 'Enter', 'Escape']) {
      expect(reduceKey(copying, key, ENGINE).handled, key).toBe(true)
    }
    expect(reduceKey(copying, 'a', ENGINE)).toMatchObject({ handled: true, state: copying })
  })

  it('takes modified keys that copy mode has an action for', () => {
    const copying = press(withText(), 'C-b', '[', 'C-Space', 'Right', 'M-w')
    expect(copying.clipboard).toBe('he')
  })

  it('passes on Tab and Ctrl or Alt keys copy mode has no action for, and stays in copy mode', () => {
    const copying = press(withText(), 'C-b', '[', 'Right')
    for (const key of ['Tab', 'C-r', 'C-l', 'M-x', 'C-M-a', 'S-Tab']) {
      expect(reduceKey(copying, key, ENGINE), key).toMatchObject({ handled: false, state: copying })
    }
  })

  it('does not run root bindings in copy mode', () => {
    const bound = runLines(ENGINE, withText(), ['bind-key -n Right new-window'])
    const state = press(bound, 'C-b', '[', 'Right')
    expect(state.sessions[0].windows).toHaveLength(2)
    expect(state.copyMode?.cursor).toEqual({ row: 0, col: 1 })
  })

  it('still takes the prefix in copy mode', () => {
    const state = press(withText(), 'C-b', '[', 'C-b', 'Right')
    expect(getActiveWindow(state)?.activePaneId).toBe('p2')
    expect(state.copyMode?.paneId).toBe('p1')
  })

  it('leaves keys alone when another pane is the one in copy mode', () => {
    const state = press(withText(), 'C-b', '[', 'C-b', 'Right')
    expect(reduceKey(state, 'Right', ENGINE)).toMatchObject({ handled: false, state })
  })

  it('runs root bindings outside copy mode', () => {
    const bound = runLines(ENGINE, twoSessionState(), ['bind-key -n M-n new-window'])
    expect(press(bound, 'M-n').sessions[0].windows).toHaveLength(3)
  })

  it('follows a changed prefix', () => {
    const state = runLines(ENGINE, twoSessionState(), ['set -g prefix C-a'])
    expect(reduceKey(state, 'C-b', ENGINE).handled).toBe(false)
    expect(press(state, 'C-a', '%').log.at(-1)).toMatchObject({ name: 'split-window', key: '%' })
  })

  it('reports a key with no prefix binding', () => {
    const result = reduceKey(press(twoSessionState(), 'C-b'), 'Q', ENGINE)
    expect(result).toMatchObject({ handled: true, ok: false, errors: [{ code: 'key.unbound', params: { key: 'Q' } }] })
    expect(result.state.prefixPending).toBe(false)
  })

  it('leaves every key to the confirm prompt while it asks', () => {
    const asking = press(twoSessionState(), 'C-b', 'x')
    expect(asking.prompt?.confirm).toBe(true)
    for (const key of ['y', 'n', 'C-b', 'x', 'Escape']) {
      expect(reduceKey(asking, key, ENGINE)).toMatchObject({ handled: false, state: asking })
    }
  })

  it('takes no keys while detached, in the prompt, or in the editor', () => {
    const copying = press(withText(), 'C-b', '[')
    const prompting = press(twoSessionState(), 'C-b', ':')
    expect(prompting.prompt).not.toBeNull()
    for (const state of [{ ...copying, isDetached: true }, { ...copying, editing: '~/.tmux.conf' }, prompting]) {
      expect(reduceKey(state, 'C-b', ENGINE)).toMatchObject({ handled: false, state })
    }
  })
})
