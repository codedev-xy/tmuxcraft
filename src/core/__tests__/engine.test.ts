import { describe, it, expect } from 'vitest'
import { ENGINE } from '../engine'
import { executeLine } from '../execute'
import { DEFAULT_PREFIX_BINDINGS } from '../keymap'
import { reduceKey } from '../reduce-key'
import { findPane } from '../selectors'
import { submitLine } from '../shell'
import { defaultState, emptyState } from '../state'
import { appendPaneLines } from '../update'
import { must, runLines, TYPED } from './harness'
import { twoSessionState } from './fixtures'

const NOT_A_COMMAND = ['parse.unknownCommand', 'parse.ambiguousCommand', 'command.unsupported', 'parse.unknownFlag']

describe('ENGINE', () => {
  it('starts tmux from the terminal outside', () => {
    const state = must(submitLine(emptyState(), 'tmux new -s dev', ENGINE)).state
    expect(state.isDetached).toBe(false)
    expect(state.sessions.map(session => session.name)).toEqual(['dev'])
  })

  it('lets commands reach the shell', () => {
    const state = must(executeLine(defaultState(), "send-keys 'echo hi' Enter", TYPED, ENGINE)).state
    expect(findPane(state, 'p1')?.content).toEqual(['$ echo hi', 'hi'])
  })

  it('lets the shell reach commands', () => {
    const state = must(submitLine(defaultState(), 'tmux split-window -h && echo done', ENGINE)).state
    expect(state.log.map(entry => entry.name)).toEqual(['split-window', 'shell'])
  })

  it.each(Object.entries(DEFAULT_PREFIX_BINDINGS))('has a command behind the default binding for %s', (key, binding) => {
    const tenWindows = runLines(ENGINE, twoSessionState(), Array.from({ length: 8 }, () => 'new-window -d'))
    const ready = appendPaneLines({ ...tenWindows, clipboard: 'text' }, 'p1', ['line'])
    const result = reduceKey({ ...ready, prefixPending: true }, key, ENGINE)
    expect(result.handled).toBe(true)
    expect(result.errors.map(error => error.code).filter(code => NOT_A_COMMAND.includes(code))).toEqual([])
    expect(result.ok, `${binding}: ${JSON.stringify(result.errors)}`).toBe(true)
  })
})
