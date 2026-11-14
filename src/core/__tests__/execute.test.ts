import { describe, it, expect } from 'vitest'
import { executeArgv, executeLine } from '../execute'
import type { CommandSpec, Engine, ExecContext } from '../commands/types'
import { fail, ok } from '../errors'
import type { TmuxError } from '../errors'
import { defaultState, emptyState } from '../state'
import type { TmuxState } from '../types'
import { appendLog, appendPaneLines } from '../update'

const TYPED: ExecContext = { origin: 'typed' }

/** `set-buffer [-a] text`: replaces the buffer, or appends to it with `-a`. */
const setBuffer: CommandSpec = {
  name: 'set-buffer',
  aliases: ['setb'],
  flags: { a: 'bool', b: 'value' },
  minArgs: 1,
  maxArgs: 1,
  requiresServer: false,
  run: (state, args) => {
    const text = args.positional[0]
    return ok({ state: { ...state, clipboard: (args.flags.a ? state.clipboard : '') + text }, detail: { text } })
  },
}

const showBuffer: CommandSpec = {
  name: 'show-buffer',
  aliases: ['showb'],
  flags: {},
  requiresServer: false,
  run: state => (state.clipboard ? ok({ state, output: [state.clipboard] }) : fail('buffer.empty')),
}

const listSessions: CommandSpec = {
  name: 'list-sessions',
  aliases: ['ls'],
  flags: {},
  requiresServer: true,
  run: state => ok({ state, output: state.sessions.map(session => session.name) }),
}

/** Records how it was invoked instead of creating anything. */
const newSession: CommandSpec = {
  name: 'new-session',
  aliases: ['new'],
  flags: { d: 'bool', s: 'value' },
  requiresServer: false,
  run: (state, _args, ctx) => ok({ state, detail: { fromShell: String(ctx.fromShell), depth: String(ctx.depth ?? 0) } }),
}

/** `source-file line…`: runs each argument as a config line, carrying on past lines that fail. */
const sourceFile: CommandSpec = {
  name: 'source-file',
  aliases: ['source'],
  flags: {},
  minArgs: 1,
  maxArgs: Infinity,
  requiresServer: false,
  run: (state, args, ctx) => {
    let current = state
    let output: readonly string[] = []
    let errors: readonly TmuxError[] = []
    args.positional.forEach((line, index) => {
      const result = ctx.exec(current, line, { origin: 'config', depth: (ctx.depth ?? 0) + 1 })
      current = result.state
      output = [...output, ...result.output]
      errors = [...errors, ...result.errors.map(error => ({ ...error, at: { path: '~/.tmux.conf', line: index + 1 } }))]
    })
    return ok({ state: current, output, errors })
  },
}

/** `send-keys line`: runs the line in pane p1's shell. */
const sendKeys: CommandSpec = {
  name: 'send-keys',
  aliases: ['send'],
  flags: {},
  minArgs: 1,
  maxArgs: 1,
  requiresServer: true,
  run: (state, args, ctx) => {
    const result = ctx.shell(state, 'p1', args.positional[0], { origin: ctx.origin })
    return ok({ state: result.state, output: result.output, errors: result.errors })
  },
}

/** A shell that only echoes the line into the pane and logs it; `false` fails. */
const ENGINE: Engine = {
  commands: [setBuffer, showBuffer, listSessions, newSession, sourceFile, sendKeys],
  shell: (state, paneId, line, ctx) => {
    const typed = appendLog(appendPaneLines(state, paneId, [`$ ${line}`]), { name: 'shell', origin: ctx.origin })
    const errors: TmuxError[] = line === 'false' ? [{ code: 'shell.commandNotFound', params: { command: line } }] : []
    return { state: typed, ok: errors.length === 0, output: [`ran ${line}`], errors }
  },
}

function run(line: string, state: TmuxState = defaultState(), ctx: ExecContext = TYPED) {
  return executeLine(state, line, ctx, ENGINE)
}

function names(state: TmuxState) {
  return state.log.map(entry => entry.name)
}

describe('executeLine', () => {
  it('does nothing for an empty line, blanks, or a comment', () => {
    const state = defaultState()
    for (const line of ['', '   ', '# set-buffer x', ' ; ; ']) {
      expect(run(line, state)).toEqual({ state, ok: true, output: [], errors: [] })
    }
  })

  it('runs a command and returns the new state', () => {
    const result = run('set-buffer hello')
    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.state.clipboard).toBe('hello')
  })

  it('finds the command by alias or unique prefix', () => {
    expect(run('setb hello').state.clipboard).toBe('hello')
    expect(run('set-b hello').state.clipboard).toBe('hello')
  })

  it('passes flags and quoted arguments to the command', () => {
    const state = { ...defaultState(), clipboard: 'a' }
    expect(run('set-buffer -a "b c"', state).state.clipboard).toBe('ab c')
  })

  it('returns what the command printed', () => {
    const state = { ...defaultState(), clipboard: 'hello' }
    expect(run('show-buffer', state).output).toEqual(['hello'])
  })

  it('logs each command that ran under its canonical name, with origin and detail', () => {
    const result = run('setb hello')
    expect(result.state.log).toEqual([{ seq: 1, name: 'set-buffer', origin: 'typed', detail: { text: 'hello' } }])
  })

  it('logs the key that fired a binding', () => {
    const result = run('show-buffer', { ...defaultState(), clipboard: 'x' }, { origin: 'key', key: 'C-a' })
    expect(result.state.log).toEqual([{ seq: 1, name: 'show-buffer', origin: 'key', key: 'C-a' }])
  })

  it('continues the sequence numbers of an existing log', () => {
    const first = run('set-buffer a')
    const second = run('set-buffer b', first.state)
    expect(second.state.log.map(entry => entry.seq)).toEqual([1, 2])
  })

  it('runs commands separated by `;` in order and joins their output', () => {
    const result = run('set-buffer a ; show-buffer ; set-buffer -a b ; show-buffer')
    expect(result.ok).toBe(true)
    expect(result.output).toEqual(['a', 'ab'])
    expect(names(result.state)).toEqual(['set-buffer', 'show-buffer', 'set-buffer', 'show-buffer'])
  })

  it('treats a quoted `;` as an argument', () => {
    expect(run("set-buffer ';'").state.clipboard).toBe(';')
    expect(run('set-buffer "a ; b"').state.clipboard).toBe('a ; b')
  })

  it('stops at the first command that fails and keeps what ran before it', () => {
    const result = run('set-buffer a ; nonsense ; set-buffer b')
    expect(result.ok).toBe(false)
    expect(result.state.clipboard).toBe('a')
    expect(names(result.state)).toEqual(['set-buffer'])
    expect(result.errors).toEqual([{ code: 'parse.unknownCommand', params: { command: 'nonsense' } }])
  })

  it('keeps the output printed before a failure', () => {
    const result = run('set-buffer a ; show-buffer ; nonsense')
    expect(result.output).toEqual(['a'])
    expect(result.ok).toBe(false)
  })

  it('does not log a command that failed', () => {
    const state = defaultState()
    const result = run('show-buffer', state)
    expect(result).toEqual({ state, ok: false, output: [], errors: [{ code: 'buffer.empty' }] })
  })

  it('reports a mistyped command with a suggestion', () => {
    const result = run('set-bufer x')
    expect(result.errors).toEqual([{ code: 'parse.unknownCommand', params: { command: 'set-bufer' }, suggestion: 'set-buffer' }])
  })

  it('reports a real tmux command the table lacks as unsupported', () => {
    expect(run('clock-mode').errors).toEqual([{ code: 'command.unsupported', params: { command: 'clock-mode' } }])
  })

  it('reports an unknown flag and a flag missing its value', () => {
    expect(run('set-buffer -x hello').errors).toEqual([{ code: 'parse.unknownFlag', params: { flag: '-x', command: 'set-buffer' } }])
    expect(run('set-buffer -b').errors).toEqual([{ code: 'parse.missingArg', params: { flag: '-b', command: 'set-buffer' } }])
  })

  it('reports too few and too many arguments, naming the command', () => {
    expect(run('setb').errors).toEqual([{ code: 'parse.tooFewArgs', params: { command: 'set-buffer' } }])
    expect(run('setb a b').errors).toEqual([{ code: 'parse.tooManyArgs', params: { command: 'set-buffer' } }])
    expect(run('show-buffer extra', { ...defaultState(), clipboard: 'x' }).errors).toEqual([
      { code: 'parse.tooManyArgs', params: { command: 'show-buffer' } },
    ])
  })

  it('refuses a command that needs a server when there are no sessions', () => {
    const state = emptyState()
    expect(run('list-sessions', state)).toEqual({ state, ok: false, output: [], errors: [{ code: 'session.none' }] })
    expect(run('list-sessions').output).toEqual(['0'])
  })

  it('checks the arguments before the server', () => {
    expect(run('list-sessions extra', emptyState()).errors).toEqual([
      { code: 'parse.tooManyArgs', params: { command: 'list-sessions' } },
    ])
  })

  it('reports an unterminated quote without running anything', () => {
    const state = defaultState()
    expect(run('set-buffer a ; set-buffer "b', state)).toEqual({
      state,
      ok: false,
      output: [],
      errors: [{ code: 'parse.unterminatedQuote' }],
    })
  })

  it('does not change the state it was given', () => {
    const state = Object.freeze(defaultState())
    const result = run('set-buffer a', state)
    expect(state.clipboard).toBe('')
    expect(state.log).toEqual([])
    expect(result.state).not.toBe(state)
  })

  it('runs inside tmux, not from a shell', () => {
    expect(run('new-session').state.log[0].detail).toEqual({ fromShell: 'false', depth: '0' })
  })
})

describe('copy mode', () => {
  const killPane: CommandSpec = {
    name: 'kill-pane',
    flags: {},
    requiresServer: true,
    run: state => ok({ state: { ...state, sessions: [] } }),
  }
  const engine: Engine = { ...ENGINE, commands: [setBuffer, killPane] }
  const copying: TmuxState = { ...defaultState(), copyMode: { paneId: 'p1', cursor: { row: 0, col: 0 }, anchor: null } }

  it('stays open while its pane exists', () => {
    expect(executeLine(copying, 'set-buffer a', TYPED, engine).state.copyMode).toEqual(copying.copyMode)
  })

  it('closes when a command removes its pane', () => {
    expect(executeLine(copying, 'kill-pane', TYPED, engine).state.copyMode).toBeNull()
  })
})

describe('commands that run commands', () => {
  it('logs the inner commands first, under their own origin', () => {
    const result = run("source-file 'set-buffer a' 'set-buffer -a b'")
    expect(result.ok).toBe(true)
    expect(result.state.clipboard).toBe('ab')
    expect(result.state.log.map(entry => [entry.seq, entry.name, entry.origin])).toEqual([
      [1, 'set-buffer', 'config'],
      [2, 'set-buffer', 'config'],
      [3, 'source-file', 'typed'],
    ])
  })

  it('runs the inner lines inside tmux, with the depth it was given', () => {
    const result = executeArgv(defaultState(), ['source-file', 'new-session'], { origin: 'script' }, ENGINE)
    expect(result.state.log[0]).toEqual({ seq: 1, name: 'new-session', origin: 'config', detail: { fromShell: 'false', depth: '1' } })
  })

  it('passes the inner output through', () => {
    expect(run("source-file 'set-buffer a' show-buffer").output).toEqual(['a'])
  })

  it('logs a command whose inner lines failed, reports their errors, and stops the line', () => {
    const result = run("source-file 'set-buffer a' nonsense 'set-buffer -a b' ; set-buffer z")
    expect(result.ok).toBe(false)
    expect(result.state.clipboard).toBe('ab')
    expect(names(result.state)).toEqual(['set-buffer', 'set-buffer', 'source-file'])
    expect(result.errors).toEqual([
      { code: 'parse.unknownCommand', params: { command: 'nonsense' }, at: { path: '~/.tmux.conf', line: 2 } },
    ])
  })
})

describe('commands that run a shell line', () => {
  it('runs the line in the pane through the engine shell', () => {
    const result = run("send-keys 'npm run dev'")
    expect(result.ok).toBe(true)
    expect(result.output).toEqual(['ran npm run dev'])
    expect(result.state.sessions[0].windows[0].layoutTree.pane?.content).toEqual(['$ npm run dev'])
    expect(names(result.state)).toEqual(['shell', 'send-keys'])
  })

  it('reports the errors of the shell line', () => {
    const result = run('send-keys false ; set-buffer z')
    expect(result.ok).toBe(false)
    expect(result.errors).toEqual([{ code: 'shell.commandNotFound', params: { command: 'false' } }])
    expect(result.state.clipboard).toBe('')
  })
})

describe('executeArgv', () => {
  const SHELL: ExecContext = { origin: 'typed' }

  it('runs the words of a `tmux …` shell command', () => {
    const result = executeArgv(defaultState(), ['set-buffer', 'a b'], SHELL, ENGINE)
    expect(result.ok).toBe(true)
    expect(result.state.clipboard).toBe('a b')
  })

  it('does not split or unquote the words again', () => {
    expect(executeArgv(defaultState(), ['set-buffer', 'a ; "b'], SHELL, ENGINE).state.clipboard).toBe('a ; "b')
  })

  it('starts a new command at each `;` word', () => {
    const result = executeArgv(defaultState(), ['set-buffer', 'a', ';', 'show-buffer', ';', 'nonsense'], SHELL, ENGINE)
    expect(result.output).toEqual(['a'])
    expect(result.errors.map(error => error.code)).toEqual(['parse.unknownCommand'])
  })

  it('ignores empty commands between `;` words', () => {
    const result = executeArgv(defaultState(), [';', 'set-buffer', 'a', ';', ';'], SHELL, ENGINE)
    expect(names(result.state)).toEqual(['set-buffer'])
  })

  it('runs new-session when there are no words, as a bare `tmux` does', () => {
    expect(names(executeArgv(emptyState(), [], SHELL, ENGINE).state)).toEqual(['new-session'])
  })

  it('tells the command it was invoked from a shell', () => {
    const result = executeArgv(defaultState(), ['new', '-d'], SHELL, ENGINE)
    expect(result.state.log[0].detail).toEqual({ fromShell: 'true', depth: '0' })
  })
})
