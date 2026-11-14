import { describe, it, expect } from 'vitest'
import type { ExecResult } from '../commands/types'
import { countPanes, getAllPanes } from '../layout-engine'
import { getOption } from '../options'
import { reduceKey } from '../reduce-key'
import { getActiveSession, getActiveWindow } from '../selectors'
import { submitLine } from '../shell'
import { defaultState, emptyState } from '../state'
import type { Session, TmuxState, Window } from '../types'
import { appendPaneLines } from '../update'
import { errorOf, must } from './harness'
import { twoSessionState } from './fixtures'
import { contentOf, ENGINE, paneOf, pressKeys, typeLines, withFiles } from './shell-engine'

// The legacy CommandParser suite, asserting on what each line or key does instead of how it parses.

const type = (state: TmuxState, line: string): ExecResult => submitLine(state, line, ENGINE)

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
const sessionNames = (state: TmuxState) => state.sessions.map(each => each.name)
const lastLog = (state: TmuxState) => state.log.at(-1)

/** twoSessionState after `detach`: the player is at the terminal outside. */
const outside = (): TmuxState => typeLines(twoSessionState(), ':detach')

/** p1 | p2 over p3, with p1 active. */
const threePanes = (): TmuxState => typeLines(defaultState(), ':split-window', ':select-pane -U', ':split-window -h', ':select-pane -L')

describe('command box', () => {
  describe('empty and exit', () => {
    it('does nothing for empty input', () => {
      const state = defaultState()
      expect(type(state, '')).toEqual({ state, ok: true, output: [], errors: [] })
      expect(type(state, '   ')).toEqual({ state, ok: true, output: [], errors: [] })
    })

    it('runs exit', () => {
      const state = typeLines(twoSessionState(), 'exit')
      expect(paneIds(state)).toEqual(['p2'])
    })
  })

  describe('tmux commands', () => {
    it('runs a bare tmux as new-session', () => {
      const state = typeLines(emptyState(), 'tmux')
      expect(sessionNames(state)).toEqual(['0'])
      expect(state.isDetached).toBe(false)
    })

    it('runs tmux new -s name', () => {
      expect(sessionNames(typeLines(emptyState(), 'tmux new -s mysession'))).toEqual(['mysession'])
    })

    it('runs tmux new-session -s name', () => {
      expect(sessionNames(typeLines(emptyState(), 'tmux new-session -s work'))).toEqual(['work'])
    })

    it('runs tmux attach -t name', () => {
      const state = typeLines(outside(), 'tmux attach -t staging')
      expect(state.isDetached).toBe(false)
      expect(session(state).name).toBe('staging')
    })

    it('runs tmux a -t name (short form)', () => {
      expect(session(typeLines(outside(), 'tmux a -t staging')).name).toBe('staging')
    })

    it('runs tmux ls', () => {
      const state = typeLines(twoSessionState(), 'tmux ls')
      expect(contentOf(state, 'p1')).toEqual(['$ tmux ls', 'dev: 2 windows (attached)', 'staging: 1 windows'])
    })

    it('runs tmux list-sessions', () => {
      expect(contentOf(typeLines(twoSessionState(), 'tmux list-sessions'), 'p1')).toHaveLength(3)
    })

    it('runs tmux kill-session -t name', () => {
      expect(sessionNames(typeLines(twoSessionState(), 'tmux kill-session -t staging'))).toEqual(['dev'])
    })

    it('kills the current session when kill-session has no target', () => {
      const state = typeLines(twoSessionState(), 'tmux kill-session')
      expect(sessionNames(state)).toEqual(['staging'])
      expect(state.isDetached).toBe(true)
    })

    it('runs tmux switch-client -t name', () => {
      expect(session(typeLines(twoSessionState(), 'tmux switch-client -t staging')).name).toBe('staging')
    })

    it('runs tmux detach', () => {
      expect(typeLines(twoSessionState(), 'tmux detach').isDetached).toBe(true)
    })

    it('runs tmux source-file', () => {
      const state = typeLines(withFiles(twoSessionState(), { '~/.tmux.conf': 'set -g mouse on\n' }), 'tmux source-file ~/.tmux.conf')
      expect(getOption(state, 'mouse')).toBe('on')
      expect(state.log.map(entry => [entry.name, entry.origin])).toContainEqual(['set-option', 'config'])
    })

    it('refuses source-file without a path', () => {
      expect(errorOf(type(twoSessionState(), 'tmux source-file')).code).toBe('parse.tooFewArgs')
    })

    it('runs tmux send-keys', () => {
      const state = typeLines(twoSessionState(), "tmux send-keys -t %p2 'echo hi' Enter")
      expect(contentOf(state, 'p2')).toEqual(['$ echo hi', 'hi'])
    })

    it('refuses an unknown tmux subcommand', () => {
      expect(errorOf(type(twoSessionState(), 'tmux foobar')).code).toBe('parse.unknownCommand')
    })

    it('suggests the command a typo resembles', () => {
      expect(errorOf(type(twoSessionState(), 'tmux atach'))).toMatchObject({ code: 'parse.unknownCommand', suggestion: 'attach' })
    })
  })

  describe('colon commands', () => {
    it('runs :split-window as a top/bottom split', () => {
      expect(win(typeLines(defaultState(), ':split-window')).layoutTree.direction).toBe('horizontal')
    })

    it('runs :split-window -h as a left/right split', () => {
      expect(win(typeLines(defaultState(), ':split-window -h')).layoutTree.direction).toBe('vertical')
    })

    it('runs the :splitw alias', () => {
      const state = typeLines(defaultState(), ':splitw')
      expect(countPanes(win(state).layoutTree)).toBe(2)
      expect(lastLog(state)?.name).toBe('split-window')
    })

    it('runs :select-pane in every direction', () => {
      const right = typeLines(threePanes(), ':select-pane -R')
      expect(win(right).activePaneId).toBe(paneIds(right)[1])
      const down = typeLines(right, ':select-pane -D')
      expect(win(down).activePaneId).toBe(paneIds(down)[2])
      const up = typeLines(down, ':select-pane -U')
      expect(paneIds(up).slice(0, 2)).toContain(win(up).activePaneId)
      const left = typeLines(right, ':select-pane -L')
      expect(win(left).activePaneId).toBe(paneIds(left)[0])
    })

    it('runs :resize-pane with a direction and an amount', () => {
      const state = typeLines(twoSessionState(), ':resize-pane -R 10')
      expect(win(state).layoutTree.ratio).toBeCloseTo(0.6)
      expect(lastLog(state)?.detail).toEqual({ pane: 'p1', direction: 'R', amount: '10' })
    })

    it('runs :resize-pane -Z as zoom', () => {
      expect(win(typeLines(twoSessionState(), ':resize-pane -Z')).zoomed).toBe(true)
    })

    it('runs :swap-pane with a direction', () => {
      expect(paneIds(typeLines(twoSessionState(), ':select-pane -R', ':swap-pane -U'))).toEqual(['p2', 'p1'])
    })

    it('runs :join-pane -s source', () => {
      const state = typeLines(twoSessionState(), ':join-pane -s :1')
      expect(paneIds(state)).toContain('p3')
      expect(session(state).windows).toHaveLength(1)
    })

    it('runs :break-pane', () => {
      expect(session(typeLines(twoSessionState(), ':break-pane')).windows).toHaveLength(3)
    })

    it('runs :new-window -n name', () => {
      expect(win(typeLines(twoSessionState(), ':new-window -n editor2')).name).toBe('editor2')
    })

    it('runs :rename-window name', () => {
      expect(win(typeLines(twoSessionState(), ':rename-window logs')).name).toBe('logs')
    })

    it('refuses rename-window without a name', () => {
      expect(errorOf(type(twoSessionState(), ':rename-window')).code).toBe('parse.tooFewArgs')
    })

    it('runs :select-window -t index', () => {
      const state = typeLines(twoSessionState(), ':new-window', ':select-window -t 0', ':select-window -t 2')
      expect(session(state).activeWindowIndex).toBe(2)
    })

    it('runs :set -g option value', () => {
      const state = typeLines(twoSessionState(), ':set -g prefix C-a')
      expect(getOption(state, 'prefix')).toBe('C-a')
      expect(lastLog(state)).toMatchObject({ name: 'set-option', detail: { option: 'prefix', value: 'C-a' } })
    })

    it('runs :setw synchronize-panes on', () => {
      expect(win(typeLines(twoSessionState(), ':setw synchronize-panes on')).synchronizePanes).toBe(true)
    })

    it('runs :setw synchronize-panes off', () => {
      const state = typeLines(twoSessionState(), ':setw synchronize-panes on', ':setw synchronize-panes off')
      expect(win(state).synchronizePanes).toBe(false)
    })

    it('runs :bind-key', () => {
      const state = typeLines(twoSessionState(), ':bind-key h split-window -h')
      expect(state.keyTables.prefix.h).toBe('split-window -h')
      expect(countPanes(win(pressKeys(state, 'C-b', 'h')).layoutTree)).toBe(3)
    })

    it('refuses bind-key without a key and a command', () => {
      expect(errorOf(type(twoSessionState(), ':bind-key')).code).toBe('parse.tooFewArgs')
    })

    it('runs :unbind-key', () => {
      const state = typeLines(twoSessionState(), ':unbind-key c')
      expect(Object.hasOwn(state.keyTables.prefix, 'c')).toBe(false)
      expect(errorOf(reduceKey(pressKeys(state, 'C-b'), 'c', ENGINE)).code).toBe('key.unbound')
    })

    it('runs :select-layout', () => {
      const state = typeLines(threePanes(), ':select-layout even-horizontal')
      expect(win(state).layoutTree.direction).toBe('vertical')
      expect(lastLog(state)?.detail).toEqual({ layout: 'even-horizontal' })
    })

    it('runs :move-window', () => {
      const state = typeLines(twoSessionState(), ':move-window -t staging')
      expect(state.sessions.map(each => each.windows.map(window => window.name))).toEqual([['server'], ['logs', 'editor']])
    })

    it('runs :list-windows', () => {
      const result = must(type(twoSessionState(), ':list-windows'))
      expect(result.output).toHaveLength(2)
      expect(result.output[0]).toContain('editor')
    })

    it('runs :list-panes', () => {
      expect(must(type(twoSessionState(), ':list-panes')).output).toEqual(['0: [40x24] %p1 (active)', '1: [40x24] %p2'])
    })

    it('refuses an unknown colon command', () => {
      expect(errorOf(type(twoSessionState(), ':foobar')).code).toBe('parse.unknownCommand')
    })

    it('does nothing for an empty colon command', () => {
      const state = twoSessionState()
      expect(type(state, ':')).toEqual({ state, ok: true, output: [], errors: [] })
    })
  })

  describe('unknown commands', () => {
    it('reports text that is not a command', () => {
      expect(errorOf(type(twoSessionState(), 'hello world'))).toEqual({ code: 'shell.commandNotFound', params: { command: 'hello' } })
    })

    it('suggests the shell command a typo resembles', () => {
      expect(errorOf(type(twoSessionState(), 'exi')).suggestion).toBe('exit')
    })
  })

  describe('quoted strings', () => {
    it('keeps a double-quoted session name whole', () => {
      expect(sessionNames(typeLines(emptyState(), 'tmux new -s "my session"'))).toEqual(['my session'])
    })

    it('keeps a single-quoted session name whole', () => {
      expect(sessionNames(typeLines(emptyState(), "tmux new -s 'my session'"))).toEqual(['my session'])
    })
  })
})

describe('prefix keys', () => {
  it('splits top/bottom on "', () => {
    const state = pressKeys(defaultState(), 'C-b', '"')
    expect(win(state).layoutTree.direction).toBe('horizontal')
    expect(lastLog(state)).toMatchObject({ name: 'split-window', origin: 'key', key: '"' })
  })

  it('splits left/right on %', () => {
    expect(win(pressKeys(defaultState(), 'C-b', '%')).layoutTree.direction).toBe('vertical')
  })

  it('creates a window on c', () => {
    expect(session(pressKeys(defaultState(), 'C-b', 'c')).windows).toHaveLength(2)
  })

  it('goes to the next window on n', () => {
    expect(session(pressKeys(twoSessionState(), 'C-b', 'n')).activeWindowIndex).toBe(1)
  })

  it('goes to the previous window on p', () => {
    expect(session(pressKeys(twoSessionState(), 'C-b', 'n', 'C-b', 'p')).activeWindowIndex).toBe(0)
  })

  it('kills the pane on x', () => {
    expect(paneIds(pressKeys(twoSessionState(), 'C-b', 'x'))).toEqual(['p2'])
  })

  it('zooms on z', () => {
    expect(win(pressKeys(twoSessionState(), 'C-b', 'z')).zoomed).toBe(true)
  })

  it('detaches on d', () => {
    expect(pressKeys(twoSessionState(), 'C-b', 'd').isDetached).toBe(true)
  })

  it('selects a pane on the arrow keys', () => {
    const right = pressKeys(threePanes(), 'C-b', 'Right')
    expect(win(right).activePaneId).toBe(paneIds(right)[1])
    const down = pressKeys(right, 'C-b', 'Down')
    expect(win(down).activePaneId).toBe(paneIds(down)[2])
    expect(paneIds(down).slice(0, 2)).toContain(win(pressKeys(down, 'C-b', 'Up')).activePaneId)
    expect(win(pressKeys(right, 'C-b', 'Left')).activePaneId).toBe(paneIds(right)[0])
  })

  it('selects a window on the number keys', () => {
    const ten = typeLines(defaultState(), ...Array.from({ length: 9 }, () => ':new-window'))
    for (let i = 0; i <= 9; i++) {
      expect(session(pressKeys(ten, 'C-b', String(i))).activeWindowIndex).toBe(i)
    }
  })

  it('resizes by one cell on Ctrl+arrow and by five on Alt+arrow', () => {
    expect(win(pressKeys(twoSessionState(), 'C-b', 'C-Right')).layoutTree.ratio).toBeCloseTo(0.51)
    expect(win(pressKeys(twoSessionState(), 'C-b', 'M-Right')).layoutTree.ratio).toBeCloseTo(0.55)
  })

  it('swaps panes on { and }', () => {
    expect(paneIds(pressKeys(twoSessionState(), 'C-b', '}'))).toEqual(['p2', 'p1'])
    expect(paneIds(pressKeys(twoSessionState(), 'C-b', 'Right', 'C-b', '{'))).toEqual(['p2', 'p1'])
  })

  it('breaks the pane out on !', () => {
    expect(session(pressKeys(twoSessionState(), 'C-b', '!')).windows).toHaveLength(3)
  })

  it('cycles the layout on Space', () => {
    const state = pressKeys(twoSessionState(), 'C-b', 'Space')
    expect(lastLog(state)).toMatchObject({ name: 'next-layout', key: 'Space' })
    expect(win(state).layoutIndex).toBe(0)
  })

  it('enters copy mode on [', () => {
    const state = pressKeys(appendPaneLines(twoSessionState(), 'p1', ['text']), 'C-b', '[')
    expect(state.copyMode?.paneId).toBe('p1')
  })

  it('pastes on ]', () => {
    const state = pressKeys({ ...twoSessionState(), clipboard: 'copied' }, 'C-b', ']')
    expect(paneOf(state, 'p1').input).toBe('copied')
  })

  it('reports a key with no binding', () => {
    const result = reduceKey(pressKeys(twoSessionState(), 'C-b'), 'Q', ENGINE)
    expect(errorOf(result)).toEqual({ code: 'key.unbound', params: { key: 'Q' } })
  })

  it('cancels the prefix on Escape', () => {
    const state = pressKeys(twoSessionState(), 'C-b', 'Escape')
    expect(state.prefixPending).toBe(false)
    expect(state.log).toEqual([])
  })
})
