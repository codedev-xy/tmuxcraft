import type { TmuxState } from '../types'
import { fail, ok } from '../errors'
import type { Result } from '../errors'
import { flagValue, hasFlag } from '../argparse'
import type { ParsedArgs } from '../argparse'
import { normalizeKey, RESERVED_KEYS } from '../keymap'
import { getOption, isOptionName, OPTIONS } from '../options'
import type { OptionName } from '../options'
import { getActiveWindow } from '../selectors'
import { resolveWindow } from '../target'
import { updateWindow } from '../update'
import type { CommandOutcome, CommandSpec } from './types'

/** The one window option the simulator models; it lives on `Window`, not in `state.options`. */
const SYNCHRONIZE_PANES = 'synchronize-panes'

/** Real tmux options the simulator does not model, so a correct config line is not reported as a typo. */
const UNMODELLED_OPTIONS: ReadonlySet<string> = new Set([
  'base-index', 'pane-base-index', 'renumber-windows', 'default-shell', 'default-command', 'set-titles',
  'display-time', 'repeat-time', 'allow-rename', 'automatic-rename', 'aggressive-resize', 'focus-events',
  'set-clipboard', 'status-keys', 'status-justify', 'status-left-length', 'status-right-length',
  'window-status-format', 'window-status-current-format', 'window-status-style', 'message-style',
  'monitor-activity', 'visual-activity', 'terminal-overrides',
])

const DIGITS = /^\d+$/

function nameError(option: string): ReturnType<typeof fail> {
  return fail(UNMODELLED_OPTIONS.has(option) ? 'option.unsupported' : 'option.unknown', { option })
}

function badValue(option: string, value: string): ReturnType<typeof fail> {
  return fail('option.badValue', { option, value })
}

/** `on` / `off` as given, or the opposite of `current` when no value is given. */
function flagSetting(option: string, current: string, value: string | undefined): Result<string> {
  if (value === undefined) return ok(current === 'on' ? 'off' : 'on')
  return value === 'on' || value === 'off' ? ok(value) : badValue(option, value)
}

function keySetting(value: string): Result<string> {
  const key = normalizeKey(value)
  if (key === null) return fail('key.invalid', { key: value })
  return RESERVED_KEYS.includes(key) ? fail('key.reserved', { key }) : ok(key)
}

/** The value to store for a global option, checked against its kind. */
function settingFor(state: TmuxState, name: OptionName, value: string | undefined, append: boolean): Result<string> {
  const spec = OPTIONS[name]
  if (spec.kind === 'flag') return flagSetting(name, getOption(state, name), value)
  if (value === undefined) return badValue(name, '')
  switch (spec.kind) {
    case 'key':
      return keySetting(value)
    case 'choice':
      return (spec.choices as readonly string[]).includes(value) ? ok(value) : badValue(name, value)
    case 'number':
      return DIGITS.test(value) ? ok(value) : badValue(name, value)
    case 'string':
      return ok(append ? getOption(state, name) + value : value)
  }
}

function setGlobal(state: TmuxState, name: OptionName, args: ParsedArgs): Result<CommandOutcome> {
  if (hasFlag(args, 'u')) {
    const options = Object.fromEntries(Object.entries(state.options).filter(([key]) => key !== name))
    return ok({ state: { ...state, options }, detail: { option: name, value: OPTIONS[name].default } })
  }
  const value = settingFor(state, name, args.positional[1], hasFlag(args, 'a'))
  if (!value.ok) return value
  return ok({ state: { ...state, options: { ...state.options, [name]: value.value } }, detail: { option: name, value: value.value } })
}

function setSynchronize(state: TmuxState, args: ParsedArgs): Result<CommandOutcome> {
  const target = resolveWindow(state, flagValue(args, 't'))
  if (!target.ok) return target
  const { window } = target.value
  const setting = hasFlag(args, 'u')
    ? ok('off')
    : flagSetting(SYNCHRONIZE_PANES, window.synchronizePanes ? 'on' : 'off', args.positional[1])
  if (!setting.ok) return setting
  const synchronizePanes = setting.value === 'on'
  const next = updateWindow(state, window.id, current => ({ ...current, synchronizePanes }))
  return ok({ state: next, detail: { option: SYNCHRONIZE_PANES, value: setting.value } })
}

function runSet(state: TmuxState, args: ParsedArgs): Result<CommandOutcome> {
  const name = args.positional[0]
  if (name === SYNCHRONIZE_PANES) return setSynchronize(state, args)
  if (!isOptionName(name)) return hasFlag(args, 'q') ? ok({ state }) : nameError(name)
  const target = flagValue(args, 't')
  if (target !== undefined) {
    const resolved = resolveWindow(state, target)
    if (!resolved.ok) return resolved
  }
  return setGlobal(state, name, args)
}

function setSpec(name: string, alias: string): CommandSpec {
  return {
    name,
    aliases: [alias],
    flags: { g: 'bool', w: 'bool', s: 'bool', u: 'bool', a: 'bool', q: 'bool', t: 'value' },
    minArgs: 1,
    maxArgs: 2,
    requiresServer: true,
    run: runSet,
  }
}

/** A value as `show-options` prints it: strings in double quotes, as tmux does. */
function shownValue(name: OptionName, value: string): string {
  if (OPTIONS[name].kind !== 'string') return value
  return `"${value.replace(/["\\]/g, ch => `\\${ch}`)}"`
}

function optionLine(state: TmuxState, name: OptionName, valueOnly: boolean): string {
  const value = getOption(state, name)
  return valueOnly ? value : `${name} ${shownValue(name, value)}`
}

function runShow(state: TmuxState, args: ParsedArgs): Result<CommandOutcome> {
  const name = args.positional[0]
  const valueOnly = hasFlag(args, 'v')
  if (name === undefined) {
    const names = Object.keys(OPTIONS) as OptionName[]
    return ok({ state, output: names.map(option => optionLine(state, option, valueOnly)) })
  }
  if (name === SYNCHRONIZE_PANES) {
    const value = getActiveWindow(state)?.synchronizePanes ? 'on' : 'off'
    return ok({ state, output: [valueOnly ? value : `${name} ${value}`] })
  }
  if (!isOptionName(name)) return nameError(name)
  return ok({ state, output: [optionLine(state, name, valueOnly)] })
}

export const OPTION_COMMANDS: readonly CommandSpec[] = [
  setSpec('set-option', 'set'),
  setSpec('set-window-option', 'setw'),
  {
    name: 'show-options',
    aliases: ['show'],
    flags: { g: 'bool', w: 'bool', s: 'bool', v: 'bool' },
    maxArgs: 1,
    requiresServer: true,
    run: runShow,
  },
]
