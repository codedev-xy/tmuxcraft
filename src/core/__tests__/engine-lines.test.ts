import { describe, it, expect } from 'vitest'
import { countPanes, getAllPanes } from '../layout-engine'
import { getActiveSession, getActiveWindow } from '../selectors'
import { submitLine } from '../shell'
import { defaultState, emptyState } from '../state'
import type { Session, TmuxState, Window } from '../types'
import { errorOf } from './harness'
import { deepFreeze, ENGINE, logNames, typeLines } from './shell-engine'

// The engine's behaviour as a player meets it: every case goes through the command box.

function session(state: TmuxState): Session {
  const active = getActiveSession(state)
  if (!active) throw new Error('no active session')
  return active
}

function win(state: TmuxState): Window {
  const active = getActiveWindow(state)
  if (!active) throw new Error('no active window')
  return active
}

const paneIds = (state: TmuxState) => getAllPanes(win(state).layoutTree).map(pane => pane.id)

describe('initial state', () => {
  it('starts with one attached session, one window and one pane', () => {
    const state = defaultState()
    expect(state.sessions).toHaveLength(1)
    expect(state.sessions[0].windows).toHaveLength(1)
    expect(countPanes(state.sessions[0].windows[0].layoutTree)).toBe(1)
    expect(state.isDetached).toBe(false)
  })

  it('runs from a state with no server', () => {
    const state = emptyState()
    expect(state.sessions).toHaveLength(0)
    expect(state.isDetached).toBe(true)
    expect(errorOf(submitLine(state, 'tmux ls', ENGINE)).code).toBe('session.none')
  })
})

describe('session lines', () => {
  it('creates a new session and switches to it', () => {
    const state = typeLines(defaultState(), ':new-session -s dev')
    expect(state.sessions).toHaveLength(2)
    expect(state.sessions[1].name).toBe('dev')
    expect(state.activeSessionId).toBe(state.sessions[1].id)
  })

  it('numbers an unnamed session', () => {
    const state = typeLines(defaultState(), ':new-session')
    expect(state.sessions.map(each => each.name)).toEqual(['0', '1'])
  })

  it('kills a session by name', () => {
    const created = typeLines(defaultState(), ':new-session -d -s temp')
    expect(created.sessions).toHaveLength(2)
    expect(typeLines(created, ':kill-session -t temp').sessions).toHaveLength(1)
  })

  it('drops out of tmux, pointing at a remaining session, after killing the attached one', () => {
    const firstId = defaultState().sessions[0].id
    const state = typeLines(defaultState(), ':new-session -s other', ':kill-session -t other')
    expect(state.activeSessionId).toBe(firstId)
    expect(state.isDetached).toBe(true)
  })

  it('switches session by name', () => {
    const state = typeLines(defaultState(), ':new-session -s project', ':new-session -s admin', ':switch-client -t project')
    expect(session(state).name).toBe('project')
  })

  it('renames the current session', () => {
    expect(session(typeLines(defaultState(), ':rename-session mywork')).name).toBe('mywork')
  })

  it('detaches', () => {
    expect(typeLines(defaultState(), ':detach').isDetached).toBe(true)
  })

  it('attaches again from the terminal outside', () => {
    expect(typeLines(defaultState(), ':detach', 'tmux attach').isDetached).toBe(false)
  })

  it('attaches to a named session', () => {
    const state = typeLines(defaultState(), ':new-session -s target', ':new-session -s other', ':detach', 'tmux attach -t target')
    expect(state.isDetached).toBe(false)
    expect(session(state).name).toBe('target')
  })
})

describe('window lines', () => {
  it('creates a window and makes it current', () => {
    const state = typeLines(defaultState(), ':new-window')
    expect(session(state).windows).toHaveLength(2)
    expect(session(state).activeWindowIndex).toBe(1)
  })

  it('creates a named window', () => {
    expect(session(typeLines(defaultState(), ':new-window -n editor')).windows[1].name).toBe('editor')
  })

  it('goes to the next window', () => {
    const state = typeLines(defaultState(), ':new-window', ':new-window', ':select-window -t 0', ':next-window')
    expect(session(state).activeWindowIndex).toBe(1)
  })

  it('wraps around going next', () => {
    expect(session(typeLines(defaultState(), ':new-window', ':next-window')).activeWindowIndex).toBe(0)
  })

  it('goes to the previous window', () => {
    const state = typeLines(defaultState(), ':new-window', ':new-window', ':previous-window')
    expect(session(state).activeWindowIndex).toBe(1)
  })

  it('wraps around going previous', () => {
    const state = typeLines(defaultState(), ':new-window', ':select-window -t 0', ':previous-window')
    expect(session(state).activeWindowIndex).toBe(1)
  })

  it('selects a window by index', () => {
    const state = typeLines(defaultState(), ':new-window', ':new-window', ':select-window -t 0')
    expect(session(state).activeWindowIndex).toBe(0)
  })

  it('refuses a window index that does not exist', () => {
    const state = defaultState()
    const result = submitLine(state, ':select-window -t 99', ENGINE)
    expect(errorOf(result).code).toBe('target.windowNotFound')
    expect(session(result.state).activeWindowIndex).toBe(0)
  })

  it('renames the current window', () => {
    expect(win(typeLines(defaultState(), ':rename-window logs')).name).toBe('logs')
  })

  it('kills the current window', () => {
    const created = typeLines(defaultState(), ':new-window')
    expect(session(created).windows).toHaveLength(2)
    expect(session(typeLines(created, ':kill-window')).windows).toHaveLength(1)
  })

  it('ends the session when its last window is killed', () => {
    const state = typeLines(defaultState(), ':new-session -s temp', ':kill-window')
    expect(state.sessions.map(each => each.name)).toEqual(['0'])
  })
})

describe('pane lines', () => {
  it('splits into a top and a bottom pane by default', () => {
    const state = typeLines(defaultState(), ':split-window')
    expect(countPanes(win(state).layoutTree)).toBe(2)
    expect(win(state).layoutTree.direction).toBe('horizontal')
  })

  it('splits into a left and a right pane with -h', () => {
    const state = typeLines(defaultState(), ':split-window -h')
    expect(countPanes(win(state).layoutTree)).toBe(2)
    expect(win(state).layoutTree.direction).toBe('vertical')
  })

  it('makes the new pane the active one', () => {
    const before = win(defaultState()).activePaneId
    const state = typeLines(defaultState(), ':split-window')
    expect(win(state).activePaneId).not.toBe(before)
    expect(paneIds(state)).toEqual([before, win(state).activePaneId])
  })

  it('kills the active pane', () => {
    const split = typeLines(defaultState(), ':split-window')
    expect(countPanes(win(split).layoutTree)).toBe(2)
    expect(countPanes(win(typeLines(split, ':kill-pane')).layoutTree)).toBe(1)
  })

  it('closes the window when its last pane is killed', () => {
    const state = typeLines(defaultState(), ':new-window', ':kill-pane')
    expect(session(state).windows).toHaveLength(1)
  })

  it('closes the pane on exit', () => {
    const state = typeLines(defaultState(), ':split-window', 'exit')
    expect(countPanes(win(state).layoutTree)).toBe(1)
  })

  it('selects a pane by direction', () => {
    const split = typeLines(defaultState(), ':split-window -h')
    const [left, right] = paneIds(split)
    expect(win(split).activePaneId).toBe(right)
    expect(win(typeLines(split, ':select-pane -L')).activePaneId).toBe(left)
  })

  it('toggles zoom', () => {
    const zoomed = typeLines(defaultState(), ':split-window', ':resize-pane -Z')
    expect(win(zoomed).zoomed).toBe(true)
    expect(win(typeLines(zoomed, ':resize-pane -Z')).zoomed).toBe(false)
  })

  it('resizes a pane by moving its border', () => {
    const state = typeLines(defaultState(), ':split-window -h', ':resize-pane -L 10')
    expect(win(state).layoutTree.ratio).toBeCloseTo(0.4)
  })

  it('swaps a pane with the one before it', () => {
    const split = typeLines(defaultState(), ':split-window')
    const [top, bottom] = paneIds(split)
    expect(paneIds(typeLines(split, ':swap-pane -U'))).toEqual([bottom, top])
  })

  it('breaks a pane out into its own window', () => {
    const state = typeLines(defaultState(), ':split-window', ':break-pane')
    expect(session(state).windows.map(each => countPanes(each.layoutTree))).toEqual([1, 1])
  })

  it('refuses to break out the only pane', () => {
    const result = submitLine(defaultState(), ':break-pane', ENGINE)
    expect(errorOf(result).code).toBe('pane.onlyOne')
    expect(session(result.state).windows).toHaveLength(1)
  })

  it('joins the pane of another window', () => {
    const state = typeLines(defaultState(), ':new-window', ':select-window -t 0', ':join-pane -s :1')
    expect(session(state).windows).toHaveLength(1)
    expect(countPanes(win(state).layoutTree)).toBe(2)
  })
})

describe('layout lines', () => {
  it('cycles to the next preset layout', () => {
    const split = typeLines(defaultState(), ':split-window', ':split-window -h')
    expect(win(typeLines(split, ':next-layout')).layoutTree).not.toEqual(win(split).layoutTree)
  })

  it('keeps a single pane as it is', () => {
    const state = defaultState()
    expect(win(typeLines(state, ':next-layout')).layoutTree).toEqual(win(state).layoutTree)
  })

  it('applies a named layout', () => {
    const state = typeLines(defaultState(), ':split-window -h', ':select-layout even-vertical')
    expect(win(state).layoutTree.direction).toBe('horizontal')
  })
})

describe('synchronize-panes', () => {
  it('turns on', () => {
    expect(win(typeLines(defaultState(), ':setw synchronize-panes on')).synchronizePanes).toBe(true)
  })

  it('turns off', () => {
    const state = typeLines(defaultState(), ':setw synchronize-panes on', ':setw synchronize-panes off')
    expect(win(state).synchronizePanes).toBe(false)
  })
})

describe('command log', () => {
  it('records every command that ran', () => {
    const state = typeLines(defaultState(), ':new-window', ':split-window')
    expect(state.log.map(entry => [entry.seq, entry.name, entry.origin])).toEqual([[1, 'new-window', 'typed'], [2, 'split-window', 'typed']])
  })

  it('records what a new session was called', () => {
    const state = typeLines(defaultState(), ':new-session -s test')
    expect(state.log.at(-1)).toMatchObject({ name: 'new-session', detail: { name: 'test' } })
  })

  it('records detaching and attaching in order', () => {
    const state = typeLines(defaultState(), ':detach', 'tmux attach')
    expect(logNames(state)).toEqual(['detach-client', 'attach-session', 'shell'])
  })

  it('does not record a command that failed', () => {
    const result = submitLine(typeLines(defaultState(), ':new-window'), ':select-window -t 99', ENGINE)
    expect(logNames(result.state)).toEqual(['new-window'])
  })
})

describe('purity', () => {
  it('never changes the state it was given', () => {
    const state = deepFreeze(defaultState())
    const next = typeLines(state, ':new-session -d -s test', ':new-window', ':split-window', 'echo hi')
    expect(next).not.toBe(state)
    expect(state.sessions).toHaveLength(1)
    expect(state.log).toEqual([])
  })

  it('hands back the same state when a line fails', () => {
    const state = { ...emptyState(), clipboard: 'test' }
    const result = submitLine(state, 'tmux attach', ENGINE)
    expect(result.ok).toBe(false)
    expect(result.state.clipboard).toBe('test')
    expect(result.state.isDetached).toBe(true)
  })
})

describe('scenarios', () => {
  it('builds a full dev workspace', () => {
    const state = typeLines(
      defaultState(),
      ':rename-window editor', ':split-window -h', ':new-window -n server', ':new-window -n logs', ':split-window',
    )
    expect(session(state).windows.map(each => each.name)).toEqual(['editor', 'server', 'logs'])
    expect(session(state).windows.map(each => countPanes(each.layoutTree))).toEqual([2, 1, 2])
  })

  it('creates several sessions and switches between them', () => {
    const state = typeLines(
      defaultState(),
      ':rename-session project', ':new-session -s admin', ':new-session -s monitoring', ':switch-client -t project',
    )
    expect(state.sessions).toHaveLength(3)
    expect(session(state).name).toBe('project')
  })

  it('keeps the layout across a detach and attach', () => {
    const detached = typeLines(defaultState(), ':split-window', ':detach')
    expect(detached.isDetached).toBe(true)
    const attached = typeLines(detached, 'tmux attach')
    expect(attached.isDetached).toBe(false)
    expect(countPanes(win(attached).layoutTree)).toBe(2)
  })
})
