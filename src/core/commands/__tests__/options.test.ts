import { describe, it, expect } from 'vitest'
import { OPTION_COMMANDS } from '../options'
import { executeLine } from '../../execute'
import { emptyState } from '../../state'
import type { TmuxState } from '../../types'
import { OPTIONS } from '../../options'
import { errorOf, must, runLines, testEngine, TYPED } from '../../__tests__/harness'
import { twoSessionState } from '../../__tests__/fixtures'

const ENGINE = testEngine(OPTION_COMMANDS)

function run(line: string, state: TmuxState = twoSessionState()) {
  return executeLine(state, line, TYPED, ENGINE)
}

function options(line: string, state?: TmuxState) {
  return must(run(line, state)).state.options
}

function syncOf(state: TmuxState, windowId: string): boolean {
  const window = state.sessions.flatMap(session => session.windows).find(candidate => candidate.id === windowId)
  return window?.synchronizePanes ?? false
}

describe('set-option', () => {
  it('sets a flag option on and off, and toggles it with no value', () => {
    expect(options('set -g mouse on').mouse).toBe('on')
    const on = runLines(ENGINE, twoSessionState(), ['set mouse on'])
    expect(options('set mouse off', on).mouse).toBe('off')
    expect(options('set mouse').mouse).toBe('on')
    expect(options('set mouse', on).mouse).toBe('off')
  })

  it('rejects a flag value other than on or off', () => {
    expect(errorOf(run('set mouse yes'))).toEqual({ code: 'option.badValue', params: { option: 'mouse', value: 'yes' } })
  })

  it('checks a choice option against its choices', () => {
    expect(options('set -g mode-keys vi')['mode-keys']).toBe('vi')
    expect(options('set status-position top')['status-position']).toBe('top')
    expect(errorOf(run('set mode-keys vim'))).toEqual({ code: 'option.badValue', params: { option: 'mode-keys', value: 'vim' } })
  })

  it('checks a number option is digits', () => {
    expect(options('set -g history-limit 50000')['history-limit']).toBe('50000')
    expect(errorOf(run('set escape-time -5')).code).toBe('option.badValue')
    expect(errorOf(run('set escape-time ten'))).toEqual({
      code: 'option.badValue',
      params: { option: 'escape-time', value: 'ten' },
    })
  })

  it('stores a string option as given', () => {
    expect(options("set -g status-left '#S | '")['status-left']).toBe('#S | ')
    expect(options('set status-style ""')['status-style']).toBe('')
  })

  it('requires a value for options other than flags', () => {
    expect(errorOf(run('set status-left'))).toEqual({ code: 'option.badValue', params: { option: 'status-left', value: '' } })
  })

  it('stores the prefix in canonical form', () => {
    expect(options('set -g prefix C-a').prefix).toBe('C-a')
    expect(options('set -g prefix c-A').prefix).toBe('C-a')
    expect(options('set prefix ^a').prefix).toBe('C-a')
  })

  it('rejects a prefix that is not a key, or one the browser keeps', () => {
    expect(errorOf(run('set prefix Ctrl+a'))).toEqual({ code: 'key.invalid', params: { key: 'Ctrl+a' } })
    expect(errorOf(run('set -g prefix C-w'))).toEqual({ code: 'key.reserved', params: { key: 'C-w' } })
    expect(errorOf(run('set -g prefix c-T'))).toEqual({ code: 'key.reserved', params: { key: 'C-t' } })
  })

  it('unsets an option back to its default with -u', () => {
    const changed = runLines(ENGINE, twoSessionState(), ['set mouse on', 'set prefix C-a'])
    const reset = must(run('set -gu mouse', changed))
    expect(reset.state.options).toEqual({ prefix: 'C-a' })
    expect(reset.state.log.at(-1)?.detail).toEqual({ option: 'mouse', value: 'off' })
  })

  it('appends to a string option with -a', () => {
    const state = runLines(ENGINE, twoSessionState(), ['set status-right "#H"', 'set -ag status-right " %H:%M"'])
    expect(state.options['status-right']).toBe('#H %H:%M')
    expect(options('set -a status-left x')['status-left']).toBe(`${OPTIONS['status-left'].default}x`)
  })

  it('ignores -a for options that are not strings', () => {
    expect(options('set -a history-limit 10')['history-limit']).toBe('10')
  })

  it('accepts -g, -s and -w and keeps one global store', () => {
    expect(options('set -s escape-time 0')['escape-time']).toBe('0')
    expect(options('set -w mouse on').mouse).toBe('on')
  })

  it('logs the option and the stored value', () => {
    const state = must(run('set -g prefix c-A')).state
    expect(state.log).toEqual([{ seq: 1, name: 'set-option', origin: 'typed', detail: { option: 'prefix', value: 'C-a' } }])
  })

  it('tells an unmodelled tmux option from an unknown one', () => {
    expect(errorOf(run('set -g base-index 1'))).toEqual({ code: 'option.unsupported', params: { option: 'base-index' } })
    expect(errorOf(run('set -g renumber-windows on')).code).toBe('option.unsupported')
    expect(errorOf(run('set -g mousee on'))).toEqual({ code: 'option.unknown', params: { option: 'mousee' } })
  })

  it('turns option errors into a no-op with -q', () => {
    const state = twoSessionState()
    for (const line of ['set -q base-index 1', 'set -gq nope on']) {
      const result = must(run(line, state))
      expect(result.state.options).toEqual({})
      expect(result.state.log.map(entry => entry.name)).toEqual(['set-option'])
    }
  })

  it('keeps value errors with -q', () => {
    expect(errorOf(run('set -q mouse maybe')).code).toBe('option.badValue')
  })

  it('checks the -t target', () => {
    expect(options('set -t staging mouse on').mouse).toBe('on')
    expect(errorOf(run('set -t nowhere mouse on')).code).toBe('target.windowNotFound')
  })

  it('needs a running server', () => {
    expect(errorOf(run('set mouse on', emptyState())).code).toBe('session.none')
  })

  it('takes a name and at most one value', () => {
    expect(errorOf(run('set')).code).toBe('parse.tooFewArgs')
    expect(errorOf(run('set status-left a b')).code).toBe('parse.tooManyArgs')
  })

  it('never mutates the state it is given', () => {
    const state = twoSessionState()
    const snapshot = structuredClone(state)
    run('set -g prefix C-a ; setw synchronize-panes on', state)
    expect(state).toEqual(snapshot)
  })
})

describe('synchronize-panes', () => {
  it('turns on for the current window with set, set -w or setw', () => {
    for (const line of ['set synchronize-panes on', 'set -w synchronize-panes on', 'setw synchronize-panes on']) {
      const state = must(run(line)).state
      expect(syncOf(state, 'w1')).toBe(true)
      expect(syncOf(state, 'w2')).toBe(false)
      expect(state.options).toEqual({})
    }
  })

  it('targets another window with -t', () => {
    const state = must(run('setw -t :1 synchronize-panes on')).state
    expect([syncOf(state, 'w1'), syncOf(state, 'w2')]).toEqual([false, true])
    expect(syncOf(must(run('setw -t staging synchronize-panes')).state, 'w3')).toBe(true)
  })

  it('toggles with no value and turns off with off or -u', () => {
    const on = must(run('setw synchronize-panes')).state
    expect(syncOf(on, 'w1')).toBe(true)
    expect(syncOf(must(run('setw synchronize-panes', on)).state, 'w1')).toBe(false)
    expect(syncOf(must(run('setw synchronize-panes off', on)).state, 'w1')).toBe(false)
    expect(syncOf(must(run('setw -u synchronize-panes', on)).state, 'w1')).toBe(false)
  })

  it('logs the window value and rejects other values', () => {
    expect(must(run('setw synchronize-panes on')).state.log[0].detail).toEqual({ option: 'synchronize-panes', value: 'on' })
    expect(errorOf(run('setw synchronize-panes 1'))).toEqual({
      code: 'option.badValue',
      params: { option: 'synchronize-panes', value: '1' },
    })
  })

  it('fails on a missing target window', () => {
    expect(errorOf(run('setw -t :7 synchronize-panes on')).code).toBe('target.windowNotFound')
  })
})

describe('set-window-option', () => {
  it('is the same command under its own name', () => {
    const state = must(run('set-window-option -g mode-keys vi')).state
    expect(state.options['mode-keys']).toBe('vi')
    expect(state.log[0].name).toBe('set-window-option')
  })
})

describe('show-options', () => {
  it('prints every option in table order, with current values', () => {
    const state = runLines(ENGINE, twoSessionState(), ['set mouse on', 'set prefix C-a'])
    const output = must(run('show -g', state)).output
    expect(output).toHaveLength(Object.keys(OPTIONS).length)
    expect(output.slice(0, 3)).toEqual(['prefix C-a', 'mouse on', 'status on'])
    expect(output).toContain('status-left "[#S] "')
    expect(output).toContain('status-right "\\"#H\\""')
    expect(output).toContain('history-limit 2000')
  })

  it('prints one option, or just its value with -v', () => {
    expect(must(run('show-options -g mode-keys')).output).toEqual(['mode-keys emacs'])
    expect(must(run('show -gv status-left')).output).toEqual(['[#S] '])
    expect(must(run('show -v prefix')).output).toEqual(['C-b'])
  })

  it('prints the current window value of synchronize-panes', () => {
    const on = must(run('setw synchronize-panes on')).state
    expect(must(run('show -w synchronize-panes', on)).output).toEqual(['synchronize-panes on'])
    expect(must(run('show -wv synchronize-panes')).output).toEqual(['off'])
  })

  it('fails like set-option on a name it does not know', () => {
    expect(errorOf(run('show base-index'))).toEqual({ code: 'option.unsupported', params: { option: 'base-index' } })
    expect(errorOf(run('show -s nope'))).toEqual({ code: 'option.unknown', params: { option: 'nope' } })
  })

  it('logs without changing the state', () => {
    const state = twoSessionState()
    const result = must(run('show', state))
    expect({ ...result.state, log: [] }).toEqual(state)
    expect(result.state.log[0].name).toBe('show-options')
  })
})
