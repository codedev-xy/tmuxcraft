import { describe, it, expect } from 'vitest'
import { KEY_COMMANDS } from '../keys'
import { OPTION_COMMANDS } from '../options'
import type { CommandSpec } from '../types'
import { executeLine } from '../../execute'
import { ok } from '../../errors'
import { DEFAULT_PREFIX_BINDINGS } from '../../keymap'
import { emptyState } from '../../state'
import type { TmuxState } from '../../types'
import { errorOf, must, runLines, testEngine, TYPED } from '../../__tests__/harness'
import { twoSessionState } from '../../__tests__/fixtures'

/** A command that only records that it ran. */
function stub(name: string, aliases: readonly string[] = []): CommandSpec {
  return { name, aliases, flags: { h: 'bool', v: 'bool' }, maxArgs: Infinity, requiresServer: false, run: state => ok({ state }) }
}

const STUBS = [
  stub('split-window', ['splitw']), stub('new-window', ['neww']), stub('rename-window', ['renamew']), stub('source-file', ['source']),
  stub('kill-pane', ['killp']), stub('kill-window', ['killw']),
]
const ENGINE = testEngine([...OPTION_COMMANDS, ...KEY_COMMANDS, ...STUBS])

function run(line: string, state: TmuxState = twoSessionState()) {
  return executeLine(state, line, TYPED, ENGINE)
}

function tables(line: string, state?: TmuxState) {
  return must(run(line, state)).state.keyTables
}

describe('bind-key', () => {
  it('binds a key in the prefix table and logs it', () => {
    const result = must(run('bind | split-window -h'))
    expect(result.state.keyTables.prefix['|']).toBe('split-window -h')
    expect(result.state.keyTables.root).toEqual({})
    expect(result.state.log).toEqual([
      { seq: 1, name: 'bind-key', origin: 'typed', detail: { key: '|', table: 'prefix', command: 'split-window -h' } },
    ])
  })

  it('replaces an existing binding', () => {
    expect(tables('bind-key % new-window').prefix['%']).toBe('new-window')
  })

  it('binds in the root table with -n or -T root', () => {
    expect(tables('bind -n M-h split-window').root).toEqual({ 'M-h': 'split-window' })
    expect(tables('bind -T root M-h split-window').root).toEqual({ 'M-h': 'split-window' })
    expect(tables('bind -T prefix h split-window').prefix.h).toBe('split-window')
    expect(must(run('bind -n M-h neww')).state.log[0].detail?.table).toBe('root')
  })

  it('rejects other tables', () => {
    expect(errorOf(run('bind -T copy-mode-vi v new-window'))).toEqual({
      code: 'key.tableUnsupported',
      params: { table: 'copy-mode-vi' },
    })
  })

  it('stores the key in canonical form', () => {
    expect(tables('bind C-A new-window').prefix['C-a']).toBe('new-window')
    expect(tables('bind -n m-left split-window').root['M-Left']).toBe('split-window')
  })

  it('rejects a word that is not a key, or a key the browser keeps', () => {
    expect(errorOf(run('bind Ctrl+x new-window'))).toEqual({ code: 'key.invalid', params: { key: 'Ctrl+x' } })
    expect(errorOf(run('bind -n c-W new-window'))).toEqual({ code: 'key.reserved', params: { key: 'C-w' } })
  })

  it('accepts and ignores -r', () => {
    expect(tables('bind -r h split-window -h').prefix.h).toBe('split-window -h')
  })

  it('keeps each argument one word when it stores the command line', () => {
    expect(tables('bind x rename-window "a b"').prefix.x).toBe("rename-window 'a b'")
    expect(tables(`bind x rename-window "it's"`).prefix.x).toBe(`rename-window "it's"`)
  })

  it('stores an escaped ; as a separator between commands', () => {
    expect(tables('bind x split-window -h \\; new-window').prefix.x).toBe('split-window -h ; new-window')
    expect(tables('bind x \\; split-window \\; \\; new-window').prefix.x).toBe('split-window ; new-window')
  })

  it('reads a single argument with a space as a command line', () => {
    const result = must(run('bind r "source-file ~/.tmux.conf ; new-window"'))
    expect(result.state.keyTables.prefix.r).toBe('source-file ~/.tmux.conf ; new-window')
  })

  it('reports a bad quote inside a single command-line argument', () => {
    expect(errorOf(run(`bind r "rename-window 'oops"`)).code).toBe('parse.unterminatedQuote')
  })

  it('checks every command name at bind time', () => {
    expect(errorOf(run('bind x splt-window'))).toMatchObject({ code: 'parse.unknownCommand', suggestion: 'split-window' })
    expect(errorOf(run('bind x new-window \\; choose-buffer'))).toEqual({
      code: 'command.unsupported',
      params: { command: 'choose-buffer' },
    })
    expect(errorOf(run('bind x "new-window ; li"')).code).toBe('parse.ambiguousCommand')
    expect(tables('bind x splitw').prefix.x).toBe('splitw')
  })

  it('needs a command', () => {
    expect(errorOf(run('bind x')).code).toBe('parse.tooFewArgs')
    expect(errorOf(run('bind x \\;'))).toEqual({ code: 'parse.tooFewArgs', params: { command: 'bind-key' } })
    expect(errorOf(run('bind x "  # nothing"')).code).toBe('parse.tooFewArgs')
  })

  it('needs a running server', () => {
    expect(errorOf(run('bind x new-window', emptyState())).code).toBe('session.none')
  })

  it('never mutates the state it is given', () => {
    const state = twoSessionState()
    const snapshot = structuredClone(state)
    run('bind x new-window ; unbind % ; unbind -a -T root', state)
    expect(state).toEqual(snapshot)
  })
})

describe('unbind-key', () => {
  it('removes one binding from the prefix table', () => {
    const result = must(run('unbind %'))
    expect(result.state.keyTables.prefix).not.toHaveProperty('%')
    expect(result.state.keyTables.prefix['"']).toBe('split-window')
    expect(result.state.log[0]).toMatchObject({ name: 'unbind-key', detail: { key: '%', table: 'prefix' } })
  })

  it('reads the key in canonical form', () => {
    expect(tables('unbind C-B').prefix).not.toHaveProperty('C-b')
  })

  it('is fine when the key is not bound', () => {
    expect(tables('unbind F').prefix).toEqual(DEFAULT_PREFIX_BINDINGS)
  })

  it('removes from the root table with -n or -T root', () => {
    const bound = runLines(ENGINE, twoSessionState(), ['bind -n M-h new-window', 'bind -n M-l new-window'])
    expect(tables('unbind -n M-h', bound).root).toEqual({ 'M-l': 'new-window' })
    expect(tables('unbind -T root M-l', bound).root).toEqual({ 'M-h': 'new-window' })
  })

  it('removes every binding of a table with -a', () => {
    const bound = runLines(ENGINE, twoSessionState(), ['bind -n M-h new-window'])
    const cleared = tables('unbind -a', bound)
    expect(cleared).toEqual({ prefix: {}, root: { 'M-h': 'new-window' } })
    expect(tables('unbind -a -T root', bound)).toEqual({ prefix: DEFAULT_PREFIX_BINDINGS, root: {} })
    expect(must(run('unbind -a')).state.log[0].detail).toEqual({ table: 'prefix', all: 'on' })
  })

  it('needs a key unless -a is given, and checks key and table', () => {
    expect(errorOf(run('unbind'))).toEqual({ code: 'parse.tooFewArgs', params: { command: 'unbind-key' } })
    expect(errorOf(run('unbind Ctrl+b'))).toEqual({ code: 'key.invalid', params: { key: 'Ctrl+b' } })
    expect(errorOf(run('unbind -T copy-mode x')).code).toBe('key.tableUnsupported')
  })
})

describe('list-keys', () => {
  it('prints the prefix table then the root table as bind-key lines', () => {
    const state = runLines(ENGINE, twoSessionState(), ['bind -n M-h split-window -h'])
    const output = must(run('list-keys', state)).output
    expect(output).toHaveLength(Object.keys(DEFAULT_PREFIX_BINDINGS).length + 1)
    expect(output).toContain('bind-key -T prefix % split-window -h')
    expect(output).toContain('bind-key -T prefix C-b send-prefix')
    expect(output.at(-1)).toBe('bind-key -T root M-h split-window -h')
  })

  it('narrows to one table with -T', () => {
    const state = runLines(ENGINE, twoSessionState(), ['bind -n M-h split-window -h'])
    expect(must(run('lsk -T root', state)).output).toEqual(['bind-key -T root M-h split-window -h'])
    expect(must(run('lsk -T prefix', state)).output).not.toContain('bind-key -T root M-h split-window -h')
    expect(errorOf(run('lsk -T copy-mode')).code).toBe('key.tableUnsupported')
  })

  it('shows the kill keys asking first, as tmux binds them', () => {
    const output = must(run('list-keys -T prefix')).output
    expect(output).toContain('bind-key -T prefix x confirm-before -p "kill-pane #P? (y/n)" kill-pane')
    expect(output).toContain('bind-key -T prefix & confirm-before -p "kill-window #W? (y/n)" kill-window')
  })

  it('escapes keys that a command line would read differently, so the lines run back', () => {
    const output = must(run('list-keys -T prefix')).output
    expect(output).toContain('bind-key -T prefix \\" split-window')
    expect(output).toContain('bind-key -T prefix \\$ command-prompt -I \'#S\' "rename-session \'%%\'"')
    const empty = { ...twoSessionState(), keyTables: { prefix: {}, root: {} } }
    const hashed = runLines(ENGINE, empty, ['bind "#" new-window', "bind ';' new-window", 'bind "\'" new-window'])
    const lines = must(run('lsk', hashed)).output
    expect(lines).toEqual(['bind-key -T prefix \\# new-window', 'bind-key -T prefix \\; new-window', "bind-key -T prefix \\' new-window"])
    expect(runLines(ENGINE, empty, lines).keyTables).toEqual(hashed.keyTables)
  })
})

describe('send-prefix', () => {
  it('runs and changes nothing but the log', () => {
    const state = twoSessionState()
    const result = must(run('send-prefix', state))
    expect({ ...result.state, log: [] }).toEqual(state)
    expect(result.state.log[0].name).toBe('send-prefix')
  })
})

describe('display-message', () => {
  it('prints the expanded message with or without -p', () => {
    expect(must(run("display -p '#S:#I.#P #W on #H'")).output).toEqual(['dev:0.0 editor on tmuxcraft'])
    expect(must(run('display-message "#{session_name}"')).output).toEqual(['dev'])
  })

  it('prints the session and window by default', () => {
    expect(must(run('display -p')).output).toEqual(['[dev] 0:editor'])
  })

  it('survives clock conversions', () => {
    const output = must(run("display -p '%H:%M %%'")).output
    expect(output).toHaveLength(1)
    expect(output[0]).toMatch(/^\d\d:\d\d %$/)
  })
})

describe('command-prompt', () => {
  it('opens the : prompt by default', () => {
    const result = must(run('command-prompt'))
    expect(result.state.prompt).toEqual({ label: ':', initial: '', template: '%%' })
    expect(result.state.log[0].name).toBe('command-prompt')
  })

  it('labels a template prompt with its command', () => {
    expect(must(run(`command-prompt "rename-window '%%'"`)).state.prompt).toEqual({
      label: '(rename-window)',
      initial: '',
      template: "rename-window '%%'",
    })
  })

  it('uses the -p label and expands the -I initial text', () => {
    const prompt = must(run(`command-prompt -p 'name:' -I '#W' "rename-window '%%'"`)).state.prompt
    expect(prompt).toEqual({ label: 'name:', initial: 'editor', template: "rename-window '%%'" })
    expect(must(run("command-prompt -I '#S %%'")).state.prompt?.initial).toBe('dev %%')
  })

  it('opens the window rename prompt from the default , binding', () => {
    const state = must(run(DEFAULT_PREFIX_BINDINGS[','])).state
    expect(state.prompt).toEqual({ label: '(rename-window)', initial: 'editor', template: "rename-window '%%'" })
  })

  it('fails while detached', () => {
    expect(errorOf(run('command-prompt', { ...twoSessionState(), isDetached: true }))).toEqual({ code: 'state.detached' })
  })
})

describe('confirm-before', () => {
  it('opens a yes/no prompt labelled with the command and logs it', () => {
    const result = must(run('confirm-before kill-pane'))
    expect(result.state.prompt).toEqual({ label: "Confirm 'kill-pane'? (y/n)", initial: '', template: 'kill-pane', confirm: true })
    expect(result.state.log.map(entry => [entry.name, entry.detail])).toEqual([['confirm-before', { command: 'kill-pane' }]])
  })

  it('names the command by its full name in the default label, and keeps the whole command line', () => {
    const prompt = must(run('confirm "killp -t 1"')).state.prompt
    expect(prompt).toEqual({ label: "Confirm 'kill-pane'? (y/n)", initial: '', template: 'killp -t 1', confirm: true })
  })

  it('uses the -p label with its formats expanded', () => {
    expect(must(run("confirm -p 'kill #S:#W.#P?' kill-window")).state.prompt?.label).toBe('kill dev:editor.0?')
  })

  it('asks before killing from the default x and & bindings', () => {
    const pane = must(run(DEFAULT_PREFIX_BINDINGS.x)).state.prompt
    expect(pane).toEqual({ label: 'kill-pane 0? (y/n)', initial: '', template: 'kill-pane', confirm: true })
    const window = must(run(DEFAULT_PREFIX_BINDINGS['&'])).state.prompt
    expect(window).toEqual({ label: 'kill-window editor? (y/n)', initial: '', template: 'kill-window', confirm: true })
  })

  it('fails on a command it does not know, without opening anything', () => {
    const result = run('confirm-before nope')
    expect(errorOf(result).code).toBe('parse.unknownCommand')
    expect(result.state.prompt).toBeNull()
  })

  it('needs exactly one command argument', () => {
    expect(errorOf(run('confirm-before'))).toEqual({ code: 'parse.tooFewArgs', params: { command: 'confirm-before' } })
    expect(errorOf(run('confirm-before kill-pane -t 1'))).toEqual({ code: 'parse.tooManyArgs', params: { command: 'confirm-before' } })
  })

  it('fails while detached', () => {
    expect(errorOf(run('confirm-before kill-pane', { ...twoSessionState(), isDetached: true }))).toEqual({ code: 'state.detached' })
  })
})
