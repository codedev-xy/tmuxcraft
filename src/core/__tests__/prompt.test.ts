import { describe, it, expect } from 'vitest'
import { cancelPrompt, submitPrompt } from '../prompt'
import { KEY_COMMANDS } from '../commands/keys'
import type { CommandSpec } from '../commands/types'
import { executeLine } from '../execute'
import { ok } from '../errors'
import { DEFAULT_PREFIX_BINDINGS } from '../keymap'
import { getActiveWindow } from '../selectors'
import type { PromptState, TmuxState } from '../types'
import { updateWindow } from '../update'
import { ENGINE as FULL_ENGINE } from '../engine'
import { findPane } from '../selectors'
import { errorOf, must, testEngine, TYPED } from './harness'
import { twoSessionState } from './fixtures'

/** Renames the current window; enough of `rename-window` for prompt tests. */
const renameWindow: CommandSpec = {
  name: 'rename-window',
  aliases: ['renamew'],
  flags: {},
  minArgs: 1,
  maxArgs: 1,
  requiresServer: true,
  run: (state, args) => {
    const name = args.positional[0]
    const window = getActiveWindow(state)
    const renamed = window ? updateWindow(state, window.id, current => ({ ...current, name })) : state
    return ok({ state: renamed, detail: { name } })
  },
}

const ENGINE = testEngine([...KEY_COMMANDS, renameWindow])

function withPrompt(prompt: PromptState): TmuxState {
  return { ...twoSessionState(), prompt }
}

/** The fixture after the default `,` binding opened its prompt. */
function renamePrompt(): TmuxState {
  return must(executeLine(twoSessionState(), DEFAULT_PREFIX_BINDINGS[','], TYPED, ENGINE)).state
}

function windowName(state: TmuxState): string | undefined {
  return getActiveWindow(state)?.name
}

describe('submitPrompt', () => {
  it('renames the window from the default , prompt', () => {
    const result = must(submitPrompt(renamePrompt(), 'logs', ENGINE))
    expect(result.state.prompt).toBeNull()
    expect(windowName(result.state)).toBe('logs')
    expect(result.state.log.map(entry => [entry.name, entry.origin])).toEqual([['command-prompt', 'typed'], ['rename-window', 'typed']])
  })

  it('keeps a name with spaces or quotes one argument', () => {
    for (const name of ['my editor', "it's", 'say "hi"', "both ' and \"", 'a$&b', '%%']) {
      const result = must(submitPrompt(renamePrompt(), name, ENGINE))
      expect(windowName(result.state)).toBe(name)
      expect(result.state.log.at(-1)?.detail).toEqual({ name })
    }
  })

  it('quotes the input in a double-quoted template too', () => {
    const state = withPrompt({ label: 'name', initial: '', template: 'rename-window "%%"' })
    expect(windowName(must(submitPrompt(state, "it's mine", ENGINE)).state)).toBe("it's mine")
  })

  it('runs a whole typed line from the : prompt', () => {
    const state = must(executeLine(twoSessionState(), 'command-prompt', TYPED, ENGINE)).state
    const result = must(submitPrompt(state, 'rename-window a ; renamew "b c"', ENGINE))
    expect(windowName(result.state)).toBe('b c')
    expect(result.state.log.filter(entry => entry.name === 'rename-window')).toHaveLength(2)
  })

  it('returns what the typed line printed', () => {
    const state = withPrompt({ label: ':', initial: '', template: '%%' })
    expect(must(submitPrompt(state, 'display -p "#S"', ENGINE)).output).toEqual(['dev'])
  })

  it('closes the prompt and reports a failing line', () => {
    const state = withPrompt({ label: ':', initial: '', template: '%%' })
    const result = submitPrompt(state, 'renam-window x', ENGINE)
    expect(errorOf(result).code).toBe('parse.unknownCommand')
    expect(result.state.prompt).toBeNull()
  })

  it('only closes the prompt on empty input', () => {
    const state = renamePrompt()
    const result = must(submitPrompt(state, '', ENGINE))
    expect(result.state).toEqual({ ...state, prompt: null })
    expect(result.output).toEqual([])
  })

  it('does nothing when no prompt is open', () => {
    const state = twoSessionState()
    expect(submitPrompt(state, 'rename-window x', ENGINE)).toEqual({ state, ok: true, output: [], errors: [] })
  })

  it('never mutates the state it is given', () => {
    const state = renamePrompt()
    const snapshot = structuredClone(state)
    submitPrompt(state, 'new name', ENGINE)
    cancelPrompt(state)
    expect(state).toEqual(snapshot)
  })
})

describe('submitPrompt on a confirm prompt', () => {
  /** The fixture after the default x binding asked whether to kill pane p1. */
  function confirmKill(): TmuxState {
    return must(executeLine(twoSessionState(), DEFAULT_PREFIX_BINDINGS.x, TYPED, FULL_ENGINE)).state
  }

  it.each(['y', 'Y'])('runs the command on %s', answer => {
    const result = must(submitPrompt(confirmKill(), answer, FULL_ENGINE))
    expect(result.state.prompt).toBeNull()
    expect(findPane(result.state, 'p1')).toBeNull()
    expect(result.state.log.map(entry => [entry.name, entry.origin])).toEqual([['confirm-before', 'typed'], ['kill-pane', 'typed']])
  })

  it.each(['n', 'N', '', 'yes', ' y', 'q'])('only closes the prompt on %j', answer => {
    const state = confirmKill()
    const result = submitPrompt(state, answer, FULL_ENGINE)
    expect(result).toEqual({ state: { ...state, prompt: null }, ok: true, output: [], errors: [] })
    expect(findPane(result.state, 'p1')).not.toBeNull()
  })

  it('runs the command as written, without filling in %%', () => {
    const state = withPrompt({ label: '?', initial: '', template: "rename-window '%%'", confirm: true })
    expect(windowName(must(submitPrompt(state, 'y', ENGINE)).state)).toBe('%%')
  })
})

describe('cancelPrompt', () => {
  it('closes the prompt without running anything', () => {
    const state = renamePrompt()
    expect(cancelPrompt(state)).toEqual({ ...state, prompt: null })
  })

  it('returns the same state when no prompt is open', () => {
    const state = twoSessionState()
    expect(cancelPrompt(state)).toBe(state)
  })
})
