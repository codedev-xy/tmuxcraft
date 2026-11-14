import { describe, it, expect } from 'vitest'
import { executeLine } from '../../execute'
import type { ShellRunner } from '../types'
import type { TmuxError } from '../../errors'
import { emptyState } from '../../state'
import type { Session, TmuxState } from '../../types'
import { appendLog, appendPaneLines } from '../../update'
import { windowPanes } from '../../selectors'
import { errorOf, must, runLines, testEngine, tmux, TYPED } from '../../__tests__/harness'
import { twoSessionState } from '../../__tests__/fixtures'
import { SESSION_COMMANDS } from '../session'
import { WINDOW_COMMANDS } from '../window'

/** Echoes the line into the pane and logs it; `false` fails. */
const stubShell: ShellRunner = (state, paneId, line, ctx) => {
  const ran = appendLog(appendPaneLines(state, paneId, [`$ ${line}`]), { name: 'shell', origin: ctx.origin })
  const errors: TmuxError[] = line === 'false' ? [{ code: 'shell.commandNotFound', params: { command: 'false' } }] : []
  return { state: ran, ok: errors.length === 0, output: [], errors }
}

const ENGINE = testEngine([...SESSION_COMMANDS, ...WINDOW_COMMANDS], stubShell)

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    Object.values(value).forEach(deepFreeze)
  }
  return value
}

const run = (state: TmuxState, line: string) => executeLine(state, line, TYPED, ENGINE)
const after = (line: string, state: TmuxState = twoSessionState()) => must(run(state, line)).state
const named = (state: TmuxState, name: string): Session => {
  const session = state.sessions.find(candidate => candidate.name === name)
  if (!session) throw new Error(`no session ${name}`)
  return session
}
const windowNames = (state: TmuxState, session: string) => named(state, session).windows.map(window => window.name)
const current = (state: TmuxState, session: string) => named(state, session).activeWindowIndex
const lastLog = (state: TmuxState) => state.log[state.log.length - 1]

/** dev: editor, server; staging: logs, extra (current logs); attached to dev. */
function wideState(): TmuxState {
  return runLines(ENGINE, twoSessionState(), ['neww -d -t staging: -n extra'])
}

describe('every window command', () => {
  it('needs a server', () => {
    const lines = ['neww', 'killw', 'renamew x', 'selectw', 'next', 'prev', 'movew', 'swapw -t 0', 'lsw']
    for (const line of lines) expect(errorOf(run(emptyState(), line))).toEqual({ code: 'session.none' })
  })

  it('does not change the state it was given', () => {
    const lines = [
      'neww -n a', 'killw -a', 'renamew x', 'selectw -t 1', 'next', 'prev',
      'movew -s dev:1 -t staging:', 'movew -s staging:0 -t dev:', 'swapw -s dev:1 -t staging:0', 'lsw -a',
    ]
    for (const line of lines) {
      const state = deepFreeze(twoSessionState())
      expect(must(run(state, line)).state).not.toBe(state)
      expect(state).toEqual(twoSessionState())
    }
  })
})

describe('new-window', () => {
  it('appends a window with one fresh pane and makes it current', () => {
    const state = after('neww')
    const window = named(state, 'dev').windows[2]
    expect(windowNames(state, 'dev')).toEqual(['editor', 'server', 'bash'])
    expect(current(state, 'dev')).toBe(2)
    expect(windowPanes(window).map(pane => pane.id)).toEqual([window.activePaneId])
    expect([window.id, window.activePaneId].sort()).toEqual(['p6', 'w5'])
    expect(lastLog(state)).toEqual({ seq: 1, name: 'new-window', origin: 'typed', detail: { name: 'bash', session: 'dev', index: '2' } })
  })

  it('names it with -n and leaves the current window with -d', () => {
    const state = after('new-window -d -n logs')
    expect(windowNames(state, 'dev')).toEqual(['editor', 'server', 'logs'])
    expect(current(state, 'dev')).toBe(0)
  })

  it('creates in another session without switching the client', () => {
    const state = after('neww -t staging: -n tail')
    expect(windowNames(state, 'staging')).toEqual(['logs', 'tail'])
    expect(current(state, 'staging')).toBe(1)
    expect(state.activeSessionId).toBe('s1')
    expect(current(after('neww -d -t staging'), 'staging')).toBe(0)
  })

  it('appends for an index past the end and refuses one in use', () => {
    expect(windowNames(after('neww -t :7 -n x'), 'dev')).toEqual(['editor', 'server', 'x'])
    expect(windowNames(after('neww -t dev:2 -n x'), 'dev')).toEqual(['editor', 'server', 'x'])
    expect(errorOf(run(twoSessionState(), 'neww -t 1'))).toEqual({ code: 'window.indexInUse', params: { index: 1 } })
  })

  it('reports an unknown target', () => {
    expect(errorOf(run(twoSessionState(), 'neww -t nope:'))).toEqual({ code: 'target.sessionNotFound', params: { target: 'nope:' } })
    expect(errorOf(run(twoSessionState(), 'neww -t dev:x'))).toEqual({ code: 'target.windowNotFound', params: { target: 'dev:x' } })
  })

  it('runs trailing words as a shell command in the new pane', () => {
    const result = must(tmux(ENGINE, twoSessionState(), 'neww -n web npm run dev'))
    const window = named(result.state, 'dev').windows[2]
    expect(windowPanes(window)[0].content).toEqual(['$ npm run dev'])
    expect(result.state.log.map(entry => entry.name)).toEqual(['shell', 'new-window'])
  })

  it('passes the errors of that shell command through', () => {
    const result = run(twoSessionState(), 'neww false')
    expect(result.ok).toBe(false)
    expect(result.errors).toEqual([{ code: 'shell.commandNotFound', params: { command: 'false' } }])
    expect(windowNames(result.state, 'dev')).toHaveLength(3)
  })
})

describe('kill-window', () => {
  it('kills the current window', () => {
    const state = after('killw')
    expect(windowNames(state, 'dev')).toEqual(['server'])
    expect(current(state, 'dev')).toBe(0)
    expect(lastLog(state).detail).toEqual({ name: 'editor', session: 'dev' })
  })

  it('kills the -t window', () => {
    expect(windowNames(after('kill-window -t :1'), 'dev')).toEqual(['editor'])
  })

  it('removes a session that loses its last window', () => {
    const state = after('killw -t staging:0')
    expect(state.sessions.map(session => session.name)).toEqual(['dev'])
    expect(state.isDetached).toBe(false)
  })

  it('detaches when the attached session loses its last window', () => {
    const state = after('killw -t staging:0 ; killw ; killw')
    expect(state.sessions).toEqual([])
    expect(state.isDetached).toBe(true)
  })

  it('kills every other window of the session with -a', () => {
    const all = after('killw -a')
    expect(windowNames(all, 'dev')).toEqual(['editor'])
    expect(lastLog(all).detail).toEqual({ name: 'editor', session: 'dev', all: 'true' })
    const state = after('killw -a -t staging:extra', wideState())
    expect(windowNames(state, 'staging')).toEqual(['extra'])
    expect(current(state, 'staging')).toBe(0)
    expect(windowNames(state, 'dev')).toEqual(['editor', 'server'])
  })

  it('reports an unknown target', () => {
    expect(errorOf(run(twoSessionState(), 'killw -t :5'))).toEqual({ code: 'target.windowNotFound', params: { target: ':5' } })
  })
})

describe('rename-window', () => {
  it('renames the current or -t window', () => {
    const state = after('renamew code')
    expect(windowNames(state, 'dev')).toEqual(['code', 'server'])
    expect(lastLog(state).detail).toEqual({ from: 'editor', name: 'code', session: 'dev' })
    expect(windowNames(after('rename-window -t staging:0 tail'), 'staging')).toEqual(['tail'])
  })

  it('needs exactly one name and a real target', () => {
    expect(errorOf(run(twoSessionState(), 'renamew'))).toEqual({ code: 'parse.tooFewArgs', params: { command: 'rename-window' } })
    expect(errorOf(run(twoSessionState(), 'renamew -t :9 x'))).toEqual({ code: 'target.windowNotFound', params: { target: ':9' } })
  })
})

describe('select-window', () => {
  it('selects the -t window by index or name', () => {
    expect(current(after('selectw -t 1'), 'dev')).toBe(1)
    const state = after('select-window -t :server')
    expect(current(state, 'dev')).toBe(1)
    expect(lastLog(state).detail).toEqual({ name: 'server', session: 'dev', index: '1' })
  })

  it('is a no-op without -t', () => {
    const state = twoSessionState()
    const result = must(run(state, 'selectw'))
    expect({ ...result.state, log: [] }).toEqual(state)
    expect(lastLog(result.state).name).toBe('select-window')
  })

  it('in another session only changes that session', () => {
    const state = after('selectw -t staging:1', wideState())
    expect(current(state, 'staging')).toBe(1)
    expect(current(state, 'dev')).toBe(0)
    expect(state.activeSessionId).toBe('s1')
  })

  it('reports an unknown window', () => {
    expect(errorOf(run(twoSessionState(), 'selectw -t 4'))).toEqual({ code: 'target.windowNotFound', params: { target: '4' } })
  })
})

describe('next-window and previous-window', () => {
  it('cycle the current session, wrapping', () => {
    const next = after('next')
    expect(current(next, 'dev')).toBe(1)
    expect(current(after('next-window', next), 'dev')).toBe(0)
    expect(current(after('prev'), 'dev')).toBe(1)
    expect(current(after('previous-window', next), 'dev')).toBe(0)
  })

  it('cycle the -t session', () => {
    const state = after('next -t staging', wideState())
    expect(current(state, 'staging')).toBe(1)
    expect(current(state, 'dev')).toBe(0)
    expect(lastLog(state).detail).toEqual({ name: 'extra', session: 'staging', index: '1' })
    expect(current(after('prev -t staging', wideState()), 'staging')).toBe(1)
  })

  it('stay put with a single window', () => {
    expect(current(after('next -t staging'), 'staging')).toBe(0)
  })

  it('report an unknown session', () => {
    expect(errorOf(run(twoSessionState(), 'next -t nope'))).toEqual({ code: 'target.sessionNotFound', params: { target: 'nope' } })
  })
})

describe('move-window', () => {
  it('moves a window to the end of another session and makes it current there', () => {
    const state = after('movew -s dev:server -t staging:')
    expect(windowNames(state, 'dev')).toEqual(['editor'])
    expect(windowNames(state, 'staging')).toEqual(['logs', 'server'])
    expect(current(state, 'staging')).toBe(1)
    expect(state.activeSessionId).toBe('s1')
    expect(lastLog(state).detail).toEqual({ name: 'server', session: 'staging', index: '1' })
  })

  it('keeps the destination current window with -d', () => {
    expect(current(after('movew -d -s dev:1 -t staging:'), 'staging')).toBe(0)
  })

  it('removes a source session that loses its last window', () => {
    const state = after('move-window -s staging:logs -t dev:')
    expect(state.sessions.map(session => session.name)).toEqual(['dev'])
    expect(windowNames(state, 'dev')).toEqual(['editor', 'server', 'logs'])
    expect(current(state, 'dev')).toBe(2)
    expect(state.isDetached).toBe(false)
  })

  it('detaches when the attached session loses its last window', () => {
    const state = after('movew -s dev:1 -t staging: ; movew -s dev:0 -t staging:')
    expect(windowNames(state, 'staging')).toEqual(['logs', 'server', 'editor'])
    expect(state.sessions).toHaveLength(1)
    expect(state.isDetached).toBe(true)
    expect(state.activeSessionId).toBe('s2')
  })

  it('moves within a session, current window by default', () => {
    const state = after('movew -t :5')
    expect(windowNames(state, 'dev')).toEqual(['server', 'editor'])
    expect(current(state, 'dev')).toBe(1)
    expect(windowNames(after('movew'), 'dev')).toEqual(['server', 'editor'])
    expect(current(after('movew -d'), 'dev')).toBe(0)
  })

  it('moving a window onto its own index changes nothing but the current window', () => {
    const state = after('movew -s :1 -t :1')
    expect(windowNames(state, 'dev')).toEqual(['editor', 'server'])
    expect(current(state, 'dev')).toBe(1)
    expect(current(after('movew -s staging:0 -t staging:0'), 'staging')).toBe(0)
  })

  it('refuses an index that holds another window', () => {
    expect(errorOf(run(twoSessionState(), 'movew -s dev:1 -t staging:0'))).toEqual({ code: 'window.indexInUse', params: { index: 0 } })
    expect(errorOf(run(twoSessionState(), 'movew -s :1 -t :0'))).toEqual({ code: 'window.indexInUse', params: { index: 0 } })
  })

  it('reports unknown source and destination', () => {
    expect(errorOf(run(twoSessionState(), 'movew -s :7'))).toEqual({ code: 'target.windowNotFound', params: { target: ':7' } })
    expect(errorOf(run(twoSessionState(), 'movew -t nope:'))).toEqual({ code: 'target.sessionNotFound', params: { target: 'nope:' } })
  })
})

describe('swap-window', () => {
  it('swaps two windows of a session and makes the target position current', () => {
    const state = after('swapw -s :0 -t :1')
    expect(windowNames(state, 'dev')).toEqual(['server', 'editor'])
    expect(current(state, 'dev')).toBe(1)
    expect(lastLog(state).detail).toEqual({ source: 'editor', target: 'server' })
  })

  it('swaps the current window with -t, keeping current indexes with -d', () => {
    expect(windowNames(after('swap-window -t 1'), 'dev')).toEqual(['server', 'editor'])
    const state = after('swapw -d -t 1')
    expect(windowNames(state, 'dev')).toEqual(['server', 'editor'])
    expect(current(state, 'dev')).toBe(0)
  })

  it('swaps across sessions', () => {
    const state = after('swapw -s dev:1 -t staging:0', wideState())
    expect(windowNames(state, 'dev')).toEqual(['editor', 'logs'])
    expect(windowNames(state, 'staging')).toEqual(['server', 'extra'])
    expect(current(state, 'staging')).toBe(0)
    expect(current(state, 'dev')).toBe(0)
    expect(state.activeSessionId).toBe('s1')
    const quiet = after('swapw -d -s staging:1 -t dev:1', wideState())
    expect(windowNames(quiet, 'dev')).toEqual(['editor', 'extra'])
    expect([current(quiet, 'dev'), current(quiet, 'staging')]).toEqual([0, 0])
  })

  it('swapping a window with itself only selects it', () => {
    const state = after('swapw -s :1 -t :1')
    expect(windowNames(state, 'dev')).toEqual(['editor', 'server'])
    expect(current(state, 'dev')).toBe(1)
  })

  it('reports unknown windows', () => {
    expect(errorOf(run(twoSessionState(), 'swapw -t 9'))).toEqual({ code: 'target.windowNotFound', params: { target: '9' } })
    expect(errorOf(run(twoSessionState(), 'swapw -s :9 -t 0'))).toEqual({ code: 'target.windowNotFound', params: { target: ':9' } })
  })
})

describe('list-windows', () => {
  it('lists the windows of the current or -t session', () => {
    expect(must(run(twoSessionState(), 'lsw')).output).toEqual(['0: editor* (2 panes)', '1: server (1 panes)'])
    expect(must(run(twoSessionState(), 'list-windows -t staging')).output).toEqual(['0: logs* (1 panes)'])
  })

  it('lists every session with -a', () => {
    expect(must(run(twoSessionState(), 'lsw -a')).output).toEqual([
      'dev:0: editor* (2 panes)',
      'dev:1: server (1 panes)',
      'staging:0: logs* (1 panes)',
    ])
  })

  it('reports an unknown session', () => {
    expect(errorOf(run(twoSessionState(), 'lsw -t nope'))).toEqual({ code: 'target.sessionNotFound', params: { target: 'nope' } })
  })
})
