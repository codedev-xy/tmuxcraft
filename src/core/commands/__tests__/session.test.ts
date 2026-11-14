import { describe, it, expect } from 'vitest'
import { executeArgv, executeLine } from '../../execute'
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

const inside = (state: TmuxState, line: string) => executeLine(state, line, TYPED, ENGINE)
const shell = (state: TmuxState, words: string) => tmux(ENGINE, state, words)
const sessionNames = (state: TmuxState) => state.sessions.map(session => session.name)
const named = (state: TmuxState, name: string): Session => {
  const session = state.sessions.find(candidate => candidate.name === name)
  if (!session) throw new Error(`no session ${name}`)
  return session
}
const lastLog = (state: TmuxState) => state.log[state.log.length - 1]
const detached = (): TmuxState => ({ ...twoSessionState(), isDetached: true })

describe('new-session', () => {
  it('a bare tmux from a detached shell creates session 0 and attaches to it', () => {
    const result = must(executeArgv(emptyState(), [], TYPED, ENGINE))
    const session = result.state.sessions[0]
    expect(sessionNames(result.state)).toEqual(['0'])
    expect(result.state.activeSessionId).toBe(session.id)
    expect(result.state.isDetached).toBe(false)
    expect(session.windows.map(window => window.name)).toEqual(['bash'])
    expect(windowPanes(session.windows[0])).toHaveLength(1)
    expect(session.windows[0].activePaneId).toBe(windowPanes(session.windows[0])[0].id)
  })

  it('allocates fresh IDs from the counter', () => {
    const state = must(shell(twoSessionState(), 'new -d -s x')).state
    const session = named(state, 'x')
    const ids = [session.id, session.windows[0].id, session.windows[0].activePaneId]
    expect(ids.sort()).toEqual(['p7', 's5', 'w6'])
    expect(state.nextId).toBe(8)
  })

  it('names an unnamed session with the lowest free number', () => {
    const state = [ 'new -d -s 0', 'new -d -s 2', 'new -d' ].reduce((current, words) => must(shell(current, words)).state, emptyState())
    expect(sessionNames(state)).toEqual(['0', '2', '1'])
  })

  it('takes the session name from -s and the window name from -n', () => {
    const state = must(shell(emptyState(), 'new -s work -n editor')).state
    expect(sessionNames(state)).toEqual(['work'])
    expect(state.sessions[0].windows[0].name).toBe('editor')
    expect(lastLog(state)).toEqual({ seq: 1, name: 'new-session', origin: 'typed', detail: { name: 'work' } })
  })

  it('rejects an empty name or one containing : or .', () => {
    for (const name of ['', 'a:b', 'a.b']) {
      expect(errorOf(executeArgv(emptyState(), ['new', '-d', '-s', name], TYPED, ENGINE))).toEqual({
        code: 'session.badName',
        params: { name },
      })
    }
  })

  it('rejects a name already in use', () => {
    const state = twoSessionState()
    expect(shell(state, 'new -d -s dev')).toEqual({
      state,
      ok: false,
      output: [],
      errors: [{ code: 'session.duplicate', params: { name: 'dev' } }],
    })
  })

  it('refuses to nest from a shell inside tmux unless -d is given', () => {
    expect(errorOf(shell(twoSessionState(), 'new -s x'))).toEqual({ code: 'session.nested' })
    const state = must(shell(twoSessionState(), 'new -d -s x')).state
    expect(sessionNames(state)).toEqual(['dev', 'staging', 'x'])
    expect(state.activeSessionId).toBe('s1')
    expect(state.isDetached).toBe(false)
  })

  it('from a detached shell without -d creates and attaches', () => {
    const state = must(shell(detached(), 'new -s x')).state
    expect(state.activeSessionId).toBe(named(state, 'x').id)
    expect(state.isDetached).toBe(false)
  })

  it('with -d while detached only creates, keeping the session a bare attach picks', () => {
    const state = must(shell(detached(), 'new -d -s x')).state
    expect(state.isDetached).toBe(true)
    expect(state.activeSessionId).toBe('s1')
  })

  it('with -d makes the first session the one a bare attach picks', () => {
    const state = must(shell(emptyState(), 'new -d -s x')).state
    expect(state.isDetached).toBe(true)
    expect(state.activeSessionId).toBe(named(state, 'x').id)
  })

  it('inside tmux switches the client to the new session unless -d is given', () => {
    const switched = must(inside(twoSessionState(), 'new -s x')).state
    expect(switched.activeSessionId).toBe(named(switched, 'x').id)
    expect(switched.isDetached).toBe(false)
    const kept = must(inside(twoSessionState(), 'new-session -d -s x')).state
    expect(kept.activeSessionId).toBe('s1')
  })

  it('runs trailing words as a shell command in the new pane', () => {
    const result = must(shell(twoSessionState(), 'new -d -s x npm run dev'))
    const window = named(result.state, 'x').windows[0]
    expect(windowPanes(window)[0].content).toEqual(['$ npm run dev'])
    expect(result.state.log.map(entry => entry.name)).toEqual(['shell', 'new-session'])
  })

  it('passes the errors of that shell command through, keeping the session', () => {
    const result = shell(twoSessionState(), 'new -d -s x false')
    expect(result.ok).toBe(false)
    expect(result.errors).toEqual([{ code: 'shell.commandNotFound', params: { command: 'false' } }])
    expect(sessionNames(result.state)).toContain('x')
    expect(lastLog(result.state).name).toBe('new-session')
  })

  it('does not change the state it was given', () => {
    const state = deepFreeze(twoSessionState())
    expect(must(inside(state, 'new -s x npm start')).state).not.toBe(state)
    expect(state.sessions).toHaveLength(2)
  })
})

describe('attach-session', () => {
  it('attaches a detached client to the session a bare attach picks', () => {
    const state = must(shell(detached(), 'attach')).state
    expect(state.isDetached).toBe(false)
    expect(state.activeSessionId).toBe('s1')
    expect(lastLog(state)).toEqual({ seq: 1, name: 'attach-session', origin: 'typed', detail: { session: 'dev' } })
  })

  it('attaches to -t, which may name a window too', () => {
    expect(must(shell(detached(), 'attach-session -t staging')).state.activeSessionId).toBe('s2')
    const state = must(shell(detached(), 'attach -d -t dev:1')).state
    expect(state.activeSessionId).toBe('s1')
    expect(state.sessions[0].activeWindowIndex).toBe(1)
  })

  it('refuses to nest from a shell inside tmux', () => {
    expect(errorOf(shell(twoSessionState(), 'attach -t staging'))).toEqual({ code: 'session.nested' })
  })

  it('inside tmux switches the client', () => {
    const state = must(inside(twoSessionState(), 'attach -t staging')).state
    expect(state.activeSessionId).toBe('s2')
    expect(state.isDetached).toBe(false)
  })

  it('reports an unknown target and a missing server', () => {
    expect(errorOf(shell(detached(), 'attach -t nope'))).toEqual({ code: 'target.sessionNotFound', params: { target: 'nope' } })
    expect(errorOf(shell(emptyState(), 'attach'))).toEqual({ code: 'session.none' })
  })

  it('does not change the state it was given', () => {
    const state = deepFreeze(detached())
    must(shell(state, 'attach -t dev:1'))
    expect(state.isDetached).toBe(true)
  })
})

describe('switch-client', () => {
  it('switches to a session', () => {
    const state = must(inside(twoSessionState(), 'switchc -t staging')).state
    expect(state.activeSessionId).toBe('s2')
    expect(lastLog(state).detail).toEqual({ session: 'staging' })
  })

  it('works as tmux switch-client from a shell inside tmux', () => {
    expect(must(shell(twoSessionState(), 'switch-client -t staging')).state.activeSessionId).toBe('s2')
  })

  it('makes a named window current too', () => {
    const state = must(inside(twoSessionState(), 'switch-client -t dev:server')).state
    expect(state.activeSessionId).toBe('s1')
    expect(state.sessions[0].activeWindowIndex).toBe(1)
  })

  it('cycles sessions with -n and -p, wrapping', () => {
    const next = must(inside(twoSessionState(), 'switchc -n')).state
    expect(next.activeSessionId).toBe('s2')
    expect(must(inside(next, 'switchc -n')).state.activeSessionId).toBe('s1')
    expect(must(inside(twoSessionState(), 'switchc -p')).state.activeSessionId).toBe('s2')
  })

  it('stays put without a target', () => {
    expect(must(inside(twoSessionState(), 'switchc')).state.activeSessionId).toBe('s1')
  })

  it('needs an attached client', () => {
    expect(errorOf(shell(detached(), 'switchc -t staging'))).toEqual({ code: 'state.detached' })
    expect(errorOf(inside(detached(), 'switchc -n'))).toEqual({ code: 'state.detached' })
  })

  it('reports an unknown target', () => {
    expect(errorOf(inside(twoSessionState(), 'switchc -t nope'))).toEqual({ code: 'target.sessionNotFound', params: { target: 'nope' } })
    expect(errorOf(inside(twoSessionState(), 'switchc -t dev:9'))).toEqual({ code: 'target.windowNotFound', params: { target: 'dev:9' } })
  })

  it('does not change the state it was given', () => {
    const state = deepFreeze(twoSessionState())
    must(inside(state, 'switchc -t dev:1 ; switchc -n'))
    expect(state.activeSessionId).toBe('s1')
    expect(state.sessions[0].activeWindowIndex).toBe(0)
  })
})

describe('detach-client', () => {
  it('detaches the client with tmux notice', () => {
    const state = must(inside(twoSessionState(), 'detach')).state
    expect(state.isDetached).toBe(true)
    expect(state.activeSessionId).toBe('s1')
    expect(state.outer.content).toEqual(['[detached (from session dev)]'])
    expect(lastLog(state)).toEqual({ seq: 1, name: 'detach-client', origin: 'typed', detail: { session: 'dev' } })
  })

  it('needs an attached client', () => {
    expect(errorOf(shell(detached(), 'detach-client'))).toEqual({ code: 'state.detached' })
  })

  it('does not change the state it was given', () => {
    const state = deepFreeze(twoSessionState())
    must(inside(state, 'detach'))
    expect(state.isDetached).toBe(false)
  })
})

describe('kill-session', () => {
  it('kills the target session and keeps the client attached elsewhere', () => {
    const state = must(inside(twoSessionState(), 'kill-session -t staging')).state
    expect(sessionNames(state)).toEqual(['dev'])
    expect(state.isDetached).toBe(false)
    expect(lastLog(state).detail).toEqual({ name: 'staging' })
  })

  it('killing the attached session detaches the client', () => {
    const state = must(inside(twoSessionState(), 'kill-session')).state
    expect(sessionNames(state)).toEqual(['staging'])
    expect(state.isDetached).toBe(true)
    expect(state.activeSessionId).toBe('s2')
    expect(state.outer.content).toEqual(['[exited]'])
  })

  it('kills every other session with -a', () => {
    const state = runLines(ENGINE, twoSessionState(), ['new -d -s x', 'kill-session -a'])
    expect(sessionNames(state)).toEqual(['dev'])
    expect(state.isDetached).toBe(false)
    expect(lastLog(state).detail).toEqual({ name: 'dev', all: 'true' })
  })

  it('with -a and another target kills the attached session too', () => {
    const state = must(inside(twoSessionState(), 'kill-session -a -t staging')).state
    expect(sessionNames(state)).toEqual(['staging'])
    expect(state.activeSessionId).toBe('s2')
    expect(state.isDetached).toBe(true)
    expect(state.outer.content).toEqual(['[exited]'])
  })

  it('killing the last session leaves no server', () => {
    const state = runLines(ENGINE, twoSessionState(), ['kill-session -t staging', 'kill-session'])
    expect(state.sessions).toEqual([])
    expect(state.activeSessionId).toBe('')
    expect(errorOf(inside(state, 'kill-session'))).toEqual({ code: 'session.none' })
  })

  it('reports an unknown target', () => {
    expect(errorOf(inside(twoSessionState(), 'kill-session -t nope'))).toEqual({ code: 'target.sessionNotFound', params: { target: 'nope' } })
  })

  it('does not change the state it was given', () => {
    const state = deepFreeze(twoSessionState())
    must(inside(state, 'kill-session -a -t staging'))
    expect(sessionNames(state)).toEqual(['dev', 'staging'])
  })
})

describe('kill-server', () => {
  it('removes every session and detaches an attached client', () => {
    const state = must(inside(twoSessionState(), 'kill-server')).state
    expect(state.sessions).toEqual([])
    expect(state.activeSessionId).toBe('')
    expect(state.isDetached).toBe(true)
    expect(state.outer.content).toEqual(['[server exited]'])
    expect(lastLog(state).name).toBe('kill-server')
  })

  it('prints nothing for a detached client', () => {
    const state = must(shell(detached(), 'kill-server')).state
    expect(state.sessions).toEqual([])
    expect(state.outer.content).toEqual([])
  })

  it('needs a server', () => {
    expect(errorOf(shell(emptyState(), 'kill-server'))).toEqual({ code: 'session.none' })
  })

  it('does not change the state it was given', () => {
    const state = deepFreeze(twoSessionState())
    must(inside(state, 'kill-server'))
    expect(state.sessions).toHaveLength(2)
  })
})

describe('rename-session', () => {
  it('renames the current session', () => {
    const state = must(inside(twoSessionState(), 'rename work')).state
    expect(sessionNames(state)).toEqual(['work', 'staging'])
    expect(lastLog(state)).toEqual({ seq: 1, name: 'rename-session', origin: 'typed', detail: { from: 'dev', name: 'work' } })
  })

  it('renames the -t session', () => {
    expect(sessionNames(must(inside(twoSessionState(), 'rename-session -t staging prod')).state)).toEqual(['dev', 'prod'])
  })

  it('allows renaming a session to its own name', () => {
    expect(sessionNames(must(inside(twoSessionState(), 'rename dev')).state)).toEqual(['dev', 'staging'])
  })

  it('rejects a bad or taken name', () => {
    expect(errorOf(inside(twoSessionState(), 'rename staging'))).toEqual({ code: 'session.duplicate', params: { name: 'staging' } })
    expect(errorOf(inside(twoSessionState(), 'rename a.b'))).toEqual({ code: 'session.badName', params: { name: 'a.b' } })
    expect(errorOf(inside(twoSessionState(), "rename ''"))).toEqual({ code: 'session.badName', params: { name: '' } })
  })

  it('needs exactly one name and a real target', () => {
    expect(errorOf(inside(twoSessionState(), 'rename'))).toEqual({ code: 'parse.tooFewArgs', params: { command: 'rename-session' } })
    expect(errorOf(inside(twoSessionState(), 'rename a b'))).toEqual({ code: 'parse.tooManyArgs', params: { command: 'rename-session' } })
    expect(errorOf(inside(twoSessionState(), 'rename -t nope x'))).toEqual({ code: 'target.sessionNotFound', params: { target: 'nope' } })
  })

  it('does not change the state it was given', () => {
    const state = deepFreeze(twoSessionState())
    must(inside(state, 'rename work'))
    expect(state.sessions[0].name).toBe('dev')
  })
})

describe('has-session', () => {
  it('succeeds for an existing session and logs it', () => {
    const result = must(shell(detached(), 'has -t staging'))
    expect(result.output).toEqual([])
    expect(lastLog(result.state)).toEqual({ seq: 1, name: 'has-session', origin: 'typed', detail: { name: 'staging' } })
    expect(lastLog(must(inside(twoSessionState(), 'has-session')).state).detail).toEqual({ name: 'dev' })
  })

  it('fails for a missing session or server', () => {
    expect(errorOf(shell(detached(), 'has -t nope'))).toEqual({ code: 'target.sessionNotFound', params: { target: 'nope' } })
    expect(errorOf(shell(emptyState(), 'has -t dev'))).toEqual({ code: 'session.none' })
  })
})

describe('list-sessions', () => {
  it('prints one line per session and marks the attached one', () => {
    expect(must(inside(twoSessionState(), 'ls')).output).toEqual(['dev: 2 windows (attached)', 'staging: 1 windows'])
    const switched = must(inside(twoSessionState(), 'switchc -t staging ; list-sessions'))
    expect(switched.output).toEqual(['dev: 2 windows', 'staging: 1 windows (attached)'])
  })

  it('marks nothing while detached', () => {
    expect(must(shell(detached(), 'ls')).output).toEqual(['dev: 2 windows', 'staging: 1 windows'])
  })

  it('needs a server', () => {
    expect(errorOf(shell(emptyState(), 'ls'))).toEqual({ code: 'session.none' })
  })
})

describe('choose-tree', () => {
  const tree = ['dev: 2 windows (attached)', '  0: editor* (2 panes)', '  1: server (1 panes)', 'staging: 1 windows', '  0: logs* (1 panes)']

  it('prints sessions with their windows', () => {
    expect(must(inside(twoSessionState(), 'choose-tree')).output).toEqual(tree)
    expect(must(inside(twoSessionState(), 'choose-tree -Zw')).output).toEqual(tree)
  })

  it('prints only sessions with -s', () => {
    expect(must(inside(twoSessionState(), 'choose-tree -s')).output).toEqual(['dev: 2 windows (attached)', 'staging: 1 windows'])
  })

  it('needs a server', () => {
    expect(errorOf(inside(emptyState(), 'choose-tree'))).toEqual({ code: 'session.none' })
  })
})
