import { describe, it, expect } from 'vitest'
import { cancelPrefix, handleKey } from '../key-handler'
import { submitPrompt } from '../prompt'
import { KEY_COMMANDS } from '../commands/keys'
import { OPTION_COMMANDS } from '../commands/options'
import type { CommandSpec } from '../commands/types'
import { ok } from '../errors'
import { getActiveWindow } from '../selectors'
import type { KeyId, TmuxState } from '../types'
import { updateWindow } from '../update'
import { must, runLines, testEngine } from './harness'
import { twoSessionState } from './fixtures'

/** Records its flags instead of splitting. */
const splitWindow: CommandSpec = {
  name: 'split-window',
  aliases: ['splitw'],
  flags: { h: 'bool', v: 'bool' },
  requiresServer: true,
  run: (state, args) => ok({ state, detail: { flags: Object.keys(args.flags).join('') } }),
}

const newWindow: CommandSpec = { name: 'new-window', aliases: ['neww'], flags: {}, requiresServer: true, run: state => ok({ state }) }

const renameWindow: CommandSpec = {
  name: 'rename-window',
  aliases: ['renamew'],
  flags: {},
  minArgs: 1,
  maxArgs: 1,
  requiresServer: true,
  run: (state, args) => {
    const window = getActiveWindow(state)
    const name = args.positional[0]
    return ok({ state: window ? updateWindow(state, window.id, current => ({ ...current, name })) : state })
  },
}

const ENGINE = testEngine([...OPTION_COMMANDS, ...KEY_COMMANDS, splitWindow, newWindow, renameWindow])

/** Presses keys in order; every press must succeed. */
function press(state: TmuxState, ...keys: KeyId[]): TmuxState {
  return keys.reduce((current, key) => must(handleKey(current, key, ENGINE)).state, state)
}

function lastLog(state: TmuxState) {
  return state.log.at(-1)
}

describe('handleKey', () => {
  it('waits for a second key after the prefix', () => {
    const state = twoSessionState()
    const result = handleKey(state, 'C-b', ENGINE)
    expect(result).toEqual({ state: { ...state, prefixPending: true }, ok: true, output: [], errors: [], handled: true })
  })

  it('runs the prefix binding of the second key, logged with the key', () => {
    const state = press(twoSessionState(), 'C-b')
    const result = handleKey(state, '%', ENGINE)
    expect(result.handled).toBe(true)
    expect(result.ok).toBe(true)
    expect(result.state.prefixPending).toBe(false)
    expect(result.state.log).toEqual([{ seq: 1, name: 'split-window', origin: 'key', key: '%', detail: { flags: 'h' } }])
  })

  it('cancels the prefix silently on Escape', () => {
    const state = press(twoSessionState(), 'C-b')
    const result = handleKey(state, 'Escape', ENGINE)
    expect(result).toEqual({ state: { ...state, prefixPending: false }, ok: true, output: [], errors: [], handled: true })
  })

  it('reports a key with no prefix binding and clears the prefix', () => {
    const result = handleKey(press(twoSessionState(), 'C-b'), 'F', ENGINE)
    expect(result.handled).toBe(true)
    expect(result.ok).toBe(false)
    expect(result.errors).toEqual([{ code: 'key.unbound', params: { key: 'F' } }])
    expect(result.state.prefixPending).toBe(false)
    expect(result.state.log).toEqual([])
  })

  it('clears the prefix when the bound command fails', () => {
    const result = handleKey(press(twoSessionState(), 'C-b'), 'x', ENGINE)
    expect(result.errors[0].code).toBe('command.unsupported')
    expect(result.state.prefixPending).toBe(false)
  })

  it('leaves other keys alone without the prefix', () => {
    const state = twoSessionState()
    expect(handleKey(state, '%', ENGINE)).toEqual({ state, ok: true, output: [], errors: [], handled: false })
  })

  it('runs root bindings without the prefix', () => {
    const state = runLines(ENGINE, twoSessionState(), ['bind -n M-h split-window -v'])
    const result = handleKey(state, 'M-h', ENGINE)
    expect(result.handled).toBe(true)
    expect(lastLog(result.state)).toMatchObject({ name: 'split-window', origin: 'key', key: 'M-h', detail: { flags: 'v' } })
  })

  it('runs every command of a binding made with \\;', () => {
    const state = runLines(ENGINE, twoSessionState(), ['bind x split-window -h \\; new-window'])
    const after = press(state, 'C-b', 'x')
    expect(after.log.slice(-2).map(entry => [entry.name, entry.origin, entry.key])).toEqual([
      ['split-window', 'key', 'x'],
      ['new-window', 'key', 'x'],
    ])
  })

  it('follows a changed prefix and ignores the old one', () => {
    const state = runLines(ENGINE, twoSessionState(), ['set -g prefix C-a'])
    expect(handleKey(state, 'C-b', ENGINE)).toMatchObject({ state, handled: false })
    const pending = press(state, 'C-a')
    expect(pending.prefixPending).toBe(true)
    expect(lastLog(press(pending, '%'))).toMatchObject({ name: 'split-window', key: '%' })
  })

  it('needs a binding for the new prefix key after the prefix', () => {
    const state = runLines(ENGINE, twoSessionState(), ['set -g prefix C-a'])
    expect(handleKey(press(state, 'C-a'), 'C-a', ENGINE).errors[0]).toEqual({ code: 'key.unbound', params: { key: 'C-a' } })
    const bound = runLines(ENGINE, state, ['unbind C-b', 'bind C-a send-prefix'])
    expect(lastLog(press(bound, 'C-a', 'C-a'))).toMatchObject({ name: 'send-prefix', origin: 'key', key: 'C-a' })
  })

  it('renames a window through the , prompt', () => {
    const opened = press(twoSessionState(), 'C-b', ',')
    expect(opened.prompt).toEqual({ label: '(rename-window)', initial: 'editor', template: "rename-window '%%'" })
    for (const name of ['my editor', "it's"]) {
      const renamed = must(submitPrompt(opened, name, ENGINE)).state
      expect(getActiveWindow(renamed)?.name).toBe(name)
      expect(renamed.prompt).toBeNull()
    }
  })

  it('leaves keys to others while detached, while a prompt is open or while editing', () => {
    const base = press(twoSessionState(), 'C-b')
    const blocked: TmuxState[] = [
      { ...base, isDetached: true },
      { ...base, prompt: { label: ':', initial: '', template: '%%' } },
      { ...base, editing: '~/.tmux.conf' },
    ]
    for (const state of blocked) {
      expect(handleKey(state, '%', ENGINE)).toEqual({ state, ok: true, output: [], errors: [], handled: false })
      expect(handleKey(state, 'C-b', ENGINE).handled).toBe(false)
    }
  })

  it('never mutates the state it is given', () => {
    const state = runLines(ENGINE, twoSessionState(), ['bind -n M-h split-window'])
    const pending = press(state, 'C-b')
    const snapshots = [structuredClone(state), structuredClone(pending)]
    handleKey(state, 'C-b', ENGINE)
    handleKey(state, 'M-h', ENGINE)
    handleKey(pending, '%', ENGINE)
    handleKey(pending, 'F', ENGINE)
    cancelPrefix(pending)
    expect([state, pending]).toEqual(snapshots)
  })
})

describe('cancelPrefix', () => {
  it('drops a pending prefix', () => {
    const pending = press(twoSessionState(), 'C-b')
    expect(cancelPrefix(pending)).toEqual({ ...pending, prefixPending: false })
  })

  it('returns the same state when no prefix is pending', () => {
    const state = twoSessionState()
    expect(cancelPrefix(state)).toBe(state)
  })
})
