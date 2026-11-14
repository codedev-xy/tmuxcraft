import { describe, it, expect } from 'vitest'
import { runShellLine, submitLine } from '../shell'
import type { ExecContext } from '../commands/types'
import { defaultState, emptyState } from '../state'
import type { TmuxState } from '../types'
import { updateWindow } from '../update'
import { getActivePane, windowPanes } from '../selectors'
import { twoSessionState } from './fixtures'
import { TYPED } from './harness'
import { contentOf, deepFreeze, ENGINE, logNames, paneOf, withFiles } from './shell-engine'

const run = (state: TmuxState, line: string, paneId = 'p1', ctx: ExecContext = TYPED) =>
  runShellLine(state, paneId, line, ctx, ENGINE)

const FILES = { '~/.tmux.conf': 'set -g mouse on\n', '~/dev.sh': 'echo hi\n', '~/notes/todo.txt': 'x' }

describe('runShellLine', () => {
  it('echoes the line, prints into the pane and returns no output', () => {
    const result = run(defaultState(), 'echo hello   world')
    expect(result).toMatchObject({ ok: true, output: [], errors: [] })
    expect(contentOf(result.state, 'p1')).toEqual(['$ echo hello   world', 'hello world'])
  })

  it('keeps quoted spaces in echo', () => {
    expect(contentOf(run(defaultState(), "echo 'a  b' \"c\"").state, 'p1')).toEqual(["$ echo 'a  b' \"c\"", 'a  b c'])
  })

  it('logs one shell entry after the line ran', () => {
    const result = run(defaultState(), 'tmux set-buffer x')
    expect(result.state.log.map(entry => [entry.name, entry.origin])).toEqual([['set-buffer', 'typed'], ['shell', 'typed']])
    expect(result.state.log[1].detail).toEqual({ pane: 'p1', line: 'tmux set-buffer x' })
  })

  it('does nothing at all for an empty or comment-only line', () => {
    const state = defaultState()
    for (const line of ['', '   ', '# echo hi', ' ; ']) {
      expect(run(state, line)).toEqual({ state, ok: true, output: [], errors: [] })
    }
  })

  it('reports an unterminated quote after echoing and logging the line', () => {
    const result = run(defaultState(), 'echo "oops')
    expect(result.errors).toEqual([{ code: 'parse.unterminatedQuote' }])
    expect(contentOf(result.state, 'p1')).toEqual(['$ echo "oops'])
    expect(logNames(result.state)).toEqual(['shell'])
  })

  it('does not change the state it was given', () => {
    const state = deepFreeze(withFiles(defaultState(), FILES))
    for (const line of ['echo a', 'clear', 'cat dev.sh', 'vim x', 'exit', 'tmux splitw', 'bash dev.sh', 'echo a | b']) {
      expect(() => run(state, line)).not.toThrow()
    }
    expect(paneOf(state, 'p1').content).toEqual([])
  })
})

describe('builtins', () => {
  const state = withFiles(defaultState(), FILES)
  const printed = (line: string) => contentOf(run(state, line).state, 'p1').slice(1)

  it('clear empties the pane, including the echo', () => {
    const before = run(state, 'echo a').state
    expect(contentOf(run(before, 'clear').state, 'p1')).toEqual([])
  })

  it('pwd prints the home directory', () => {
    expect(printed('pwd')).toEqual(['~'])
  })

  it('ls lists the entries of the home directory, hiding dot-files without -a', () => {
    expect(printed('ls')).toEqual(['dev.sh  notes'])
    expect(printed('ls -a')).toEqual(['.tmux.conf  dev.sh  notes'])
    expect(printed('ls -la')).toEqual(['.tmux.conf  dev.sh  notes'])
  })

  it('ls prints nothing in an empty home', () => {
    expect(contentOf(run(defaultState(), 'ls').state, 'p1')).toEqual(['$ ls'])
  })

  it('cat prints a file under any spelling of its path', () => {
    const multi = withFiles(state, { '~/a.txt': 'one\ntwo\n' })
    expect(contentOf(run(multi, 'cat ./a.txt').state, 'p1')).toEqual(['$ cat ./a.txt', 'one', 'two'])
    expect(printed('cat ~/.tmux.conf')).toEqual(['set -g mouse on'])
  })

  it('cat reports a missing file and a missing operand', () => {
    expect(run(state, 'cat nope').errors).toEqual([{ code: 'file.notFound', params: { path: '~/nope' } }])
    expect(run(state, 'cat').errors).toEqual([{ code: 'shell.missingOperand', params: { command: 'cat' } }])
  })

  it.each(['vim', 'vi', 'nano'])('%s opens the editor on the normalized path', editor => {
    expect(run(state, `${editor} ./.tmux.conf`).state.editing).toBe('~/.tmux.conf')
    expect(run(state, editor).errors).toEqual([{ code: 'shell.missingOperand', params: { command: editor } }])
  })

  it('exit closes the pane it ran in', () => {
    const result = run(twoSessionState(), 'exit')
    expect(windowPanes(result.state.sessions[0].windows[0]).map(pane => pane.id)).toEqual(['p2'])
  })

  it('exit stops the rest of the line', () => {
    const result = run(twoSessionState(), 'exit ; tmux set-buffer x')
    expect(result.state.clipboard).toBe('')
  })

  it('exit outside tmux does nothing', () => {
    const state = emptyState()
    const result = run(state, 'exit', 'outer')
    expect(result.ok).toBe(true)
    expect(result.state.outer.content).toEqual(['$ exit'])
  })

  it('accepts well-known programs silently', () => {
    for (const program of ['npm run dev', 'git status', 'htop', 'python3 app.py', 'docker ps', 'go test']) {
      const result = run(state, program)
      expect(result.ok).toBe(true)
      expect(contentOf(result.state, 'p1')).toEqual([`$ ${program}`])
    }
  })

  it('reports an unknown command', () => {
    expect(run(state, 'frobnicate --now').errors).toEqual([{ code: 'shell.commandNotFound', params: { command: 'frobnicate' } }])
  })

  it.each([['tmxu ls', 'tmux'], ['tumx', 'tmux'], ['exi', 'exit'], ['ech hi', 'echo'], ['claer', 'clear']])(
    'suggests the command `%s` resembles',
    (line, suggestion) => {
      const command = line.split(' ')[0]
      expect(run(state, line).errors).toEqual([{ code: 'shell.commandNotFound', params: { command }, suggestion }])
    },
  )

  it('does not suggest a silent stand-in program', () => {
    expect(run(state, 'nmp install').errors).toEqual([{ code: 'shell.commandNotFound', params: { command: 'nmp' } }])
  })
})

describe('operators', () => {
  it('runs every command separated by an unquoted `;`, even after a failure', () => {
    const result = run(defaultState(), 'echo a ; nope ; echo b')
    expect(contentOf(result.state, 'p1')).toEqual(['$ echo a ; nope ; echo b', 'a', 'b'])
    expect(result.ok).toBe(false)
    expect(result.errors.map(error => error.code)).toEqual(['shell.commandNotFound'])
  })

  it('runs the command after `&&` only when the previous one succeeded', () => {
    expect(contentOf(run(defaultState(), 'echo a && echo b').state, 'p1').slice(1)).toEqual(['a', 'b'])
    expect(contentOf(run(defaultState(), 'nope && echo b').state, 'p1').slice(1)).toEqual([])
    expect(contentOf(run(defaultState(), 'nope && echo b && echo c ; echo d').state, 'p1').slice(1)).toEqual(['d'])
  })

  it.each(['|', '||', '&', '>', '>>', '<'])('refuses an unquoted `%s` and runs nothing', token => {
    const result = run(defaultState(), `tmux set-buffer x ${token} echo y`)
    expect(result.errors).toEqual([{ code: 'shell.unsupported', params: { token } }])
    expect(result.state.clipboard).toBe('')
    expect(contentOf(result.state, 'p1')).toEqual([`$ tmux set-buffer x ${token} echo y`])
  })

  it('treats quoted or escaped operators as plain words', () => {
    expect(contentOf(run(defaultState(), "echo '|' \\& '&&' \\;").state, 'p1')[1]).toBe('| & && ;')
  })

  it('runs `tmux bind` with a quoted pipe', () => {
    const result = run(defaultState(), "tmux bind '|' split-window -h")
    expect(result.ok).toBe(true)
    expect(result.state.keyTables.prefix['|']).toBe('split-window -h')
  })
})

describe('tmux from a shell', () => {
  it('prints tmux output into the pane', () => {
    const result = run(twoSessionState(), 'tmux ls')
    expect(contentOf(result.state, 'p1')).toEqual(['$ tmux ls', 'dev: 2 windows (attached)', 'staging: 1 windows'])
  })

  it('passes an escaped `;` to tmux as a command separator', () => {
    const result = run(defaultState(), 'tmux set-buffer a \\; set-buffer -a b')
    expect(result.state.clipboard).toBe('ab')
  })

  it('refuses to nest a session inside tmux', () => {
    expect(run(defaultState(), 'tmux').errors).toEqual([{ code: 'session.nested' }])
  })

  it('starts and attaches a session from outside tmux', () => {
    const result = run(emptyState(), 'tmux new -s work', 'outer')
    expect(result.ok).toBe(true)
    expect(result.state.isDetached).toBe(false)
    expect(result.state.sessions.map(session => session.name)).toEqual(['work'])
    expect(result.state.outer.content).toEqual(['$ tmux new -s work'])
  })

  it('prints `tmux ls` into the terminal outside tmux and attaches with `tmux attach`', () => {
    const detached = { ...twoSessionState(), isDetached: true }
    const listed = run(detached, 'tmux ls', 'outer')
    expect(listed.state.outer.content).toEqual(['$ tmux ls', 'dev: 2 windows', 'staging: 1 windows'])
    const attached = run(listed.state, 'tmux attach -t staging', 'outer')
    expect(attached.state).toMatchObject({ isDetached: false, activeSessionId: 's2' })
  })

  it('reports tmux errors without printing them', () => {
    const result = run(emptyState(), 'tmux ls', 'outer')
    expect(result.errors).toEqual([{ code: 'session.none' }])
    expect(result.state.outer.content).toEqual(['$ tmux ls'])
  })

  it('runs tmux with the origin and depth it was given', () => {
    const result = run(defaultState(), 'tmux set-buffer x', 'p1', { origin: 'script', depth: 2 })
    expect(result.state.log.map(entry => entry.origin)).toEqual(['script', 'script'])
  })

  it('survives tmux killing the pane it was typed in', () => {
    const result = run(twoSessionState(), 'tmux kill-pane ; echo after')
    expect(result.ok).toBe(true)
    expect(getActivePane(result.state)?.id).toBe('p2')
    expect(contentOf(result.state, 'p2')).toEqual([])
  })
})

describe('submitLine', () => {
  it('runs in the active pane', () => {
    const result = submitLine(twoSessionState(), 'echo hi', ENGINE)
    expect(contentOf(result.state, 'p1')).toEqual(['$ echo hi', 'hi'])
    expect(result.state.log.at(-1)).toMatchObject({ name: 'shell', origin: 'typed' })
  })

  it('runs in the terminal outside tmux while detached', () => {
    const state = { ...twoSessionState(), isDetached: true }
    expect(submitLine(state, 'echo hi', ENGINE).state.outer.content).toEqual(['$ echo hi', 'hi'])
  })

  it('runs a `:` line as a tmux command', () => {
    const result = submitLine(twoSessionState(), ':  set-buffer hi', ENGINE)
    expect(result.state.clipboard).toBe('hi')
    expect(contentOf(result.state, 'p1')).toEqual([])
    expect(logNames(result.state)).toEqual(['set-buffer'])
  })

  it('returns what a `:` command printed', () => {
    expect(submitLine({ ...twoSessionState(), clipboard: 'x' }, ':show-buffer', ENGINE).output).toEqual(['x'])
  })

  const synced = updateWindow(twoSessionState(), 'w1', window => ({ ...window, synchronizePanes: true }))

  it('types into every pane of a synchronized window', () => {
    const result = submitLine(synced, 'echo hi', ENGINE)
    expect(contentOf(result.state, 'p1')).toEqual(['$ echo hi', 'hi'])
    expect(contentOf(result.state, 'p2')).toEqual(['$ echo hi', 'hi'])
    expect(contentOf(result.state, 'p3')).toEqual([])
  })

  it('merges the errors of every synchronized pane', () => {
    const result = submitLine(synced, 'nope', ENGINE)
    expect(result.ok).toBe(false)
    expect(result.errors).toHaveLength(2)
  })

  it('runs a tmux line once in a synchronized window', () => {
    const result = submitLine(synced, 'tmux splitw', ENGINE)
    expect(windowPanes(result.state.sessions[0].windows[0])).toHaveLength(3)
    expect(contentOf(result.state, 'p2')).toEqual([])
  })

  it('closes every synchronized pane with exit', () => {
    const result = submitLine(synced, 'exit', ENGINE)
    expect(result.ok).toBe(true)
    expect(result.state.sessions[0].windows.map(window => window.id)).toEqual(['w2'])
  })

  it('skips synchronized panes that an earlier pane closed', () => {
    const state = withFiles(synced, { '~/k.sh': 'tmux kill-pane -t %p2\n' })
    const result = submitLine(state, 'bash k.sh', ENGINE)
    expect(result.ok).toBe(true)
    expect(result.state.log.filter(entry => entry.name === 'shell' && entry.origin === 'typed')).toHaveLength(1)
  })
})
