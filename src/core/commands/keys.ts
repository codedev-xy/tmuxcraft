import type { KeyId, KeyTables, TmuxState } from '../types'
import { fail, ok } from '../errors'
import type { Result } from '../errors'
import { flagValue, hasFlag } from '../argparse'
import type { ParsedArgs } from '../argparse'
import { expandFormat, expandNames } from '../status-format'
import { quoteWords, splitCommands, tokenize } from '../tokenize'
import { findCommand } from './find'
import { bindableKey, readKey } from './key-shared'
import type { CommandOutcome, CommandSpec } from './types'

type TableName = keyof KeyTables

const TABLE_ORDER: readonly TableName[] = ['prefix', 'root']

/** Keys `list-keys` writes with a backslash, because a command line would read them bare as something else. */
const ESCAPED_KEYS: ReadonlySet<KeyId> = new Set(['"', "'", '#', ';', '$', '\\', '{', '}', '~'])

const DEFAULT_MESSAGE = '[#S] #I:#W'

/** Commands have no clock; `display-message` expands `%` conversions against this fixed date. */
const COMMAND_CLOCK = new Date(0)

function tableNamed(table: string): Result<TableName> {
  return table === 'prefix' || table === 'root' ? ok(table) : fail('key.tableUnsupported', { table })
}

/** `-T table`, otherwise `root` with `-n` and `prefix` without. */
function tableOf(args: ParsedArgs): Result<TableName> {
  const named = flagValue(args, 'T')
  if (named !== undefined) return tableNamed(named)
  return ok(hasFlag(args, 'n') ? 'root' : 'prefix')
}

function withTable(state: TmuxState, table: TableName, bindings: KeyTables[TableName]): TmuxState {
  return { ...state, keyTables: { ...state.keyTables, [table]: bindings } }
}

interface Binding {
  readonly line: string
  readonly commands: readonly (readonly string[])[]
}

/**
 * The command line a binding stores. Words are split at `;` words and quoted back into a line;
 * a single word with a space already is a command line (`bind r "source-file ~/.tmux.conf"`), as in tmux.
 */
function bindingOf(words: readonly string[]): Result<Binding> {
  if (words.length === 1 && words[0].includes(' ')) {
    const tokens = tokenize(words[0])
    if (!tokens.ok) return tokens
    return ok({ line: words[0], commands: splitCommands(tokens.value) })
  }
  const commands = splitCommands(words.map(text => ({ text, separator: text === ';', quoted: false })))
  return ok({ line: commands.map(quoteWords).join(' ; '), commands })
}

/** Resolves every command name now, so a typo fails at bind time rather than when the key is pressed. */
function checkCommands(binding: Binding, table: readonly CommandSpec[]): Result<Binding> {
  if (binding.commands.length === 0) return fail('parse.tooFewArgs', { command: 'bind-key' })
  for (const words of binding.commands) {
    const found = findCommand(words[0], table)
    if (!found.ok) return found
  }
  return ok(binding)
}

const bindKey: CommandSpec = {
  name: 'bind-key',
  aliases: ['bind'],
  flags: { n: 'bool', r: 'bool', T: 'value' },
  minArgs: 2,
  maxArgs: Infinity,
  requiresServer: true,
  run: (state, args, ctx): Result<CommandOutcome> => {
    const table = tableOf(args)
    if (!table.ok) return table
    const key = bindableKey(args.positional[0])
    if (!key.ok) return key
    const parsed = bindingOf(args.positional.slice(1))
    const binding = parsed.ok ? checkCommands(parsed.value, ctx.commands) : parsed
    if (!binding.ok) return binding
    const { line } = binding.value
    const bindings = { ...state.keyTables[table.value], [key.value]: line }
    return ok({ state: withTable(state, table.value, bindings), detail: { key: key.value, table: table.value, command: line } })
  },
}

const unbindKey: CommandSpec = {
  name: 'unbind-key',
  aliases: ['unbind'],
  flags: { n: 'bool', a: 'bool', T: 'value' },
  maxArgs: 1,
  requiresServer: true,
  run: (state, args) => {
    const table = tableOf(args)
    if (!table.ok) return table
    if (hasFlag(args, 'a')) return ok({ state: withTable(state, table.value, {}), detail: { table: table.value, all: 'on' } })
    const word = args.positional[0]
    if (word === undefined) return fail('parse.tooFewArgs', { command: 'unbind-key' })
    const key = readKey(word)
    if (!key.ok) return key
    const bindings = Object.fromEntries(Object.entries(state.keyTables[table.value]).filter(([bound]) => bound !== key.value))
    return ok({ state: withTable(state, table.value, bindings), detail: { key: key.value, table: table.value } })
  },
}

function listedKey(key: KeyId): string {
  return ESCAPED_KEYS.has(key) ? `\\${key}` : key
}

const listKeys: CommandSpec = {
  name: 'list-keys',
  aliases: ['lsk'],
  flags: { T: 'value' },
  requiresServer: true,
  run: (state, args) => {
    const named = flagValue(args, 'T')
    const table = named === undefined ? null : tableNamed(named)
    if (table && !table.ok) return table
    const tables = table ? [table.value] : TABLE_ORDER
    const output = tables.flatMap(name =>
      Object.entries(state.keyTables[name]).map(([key, line]) => `bind-key -T ${name} ${listedKey(key)} ${line}`),
    )
    return ok({ state, output })
  },
}

/** The browser has nothing to send the prefix key to, so this only runs. */
const sendPrefix: CommandSpec = {
  name: 'send-prefix',
  flags: {},
  requiresServer: true,
  run: state => ok({ state }),
}

const displayMessage: CommandSpec = {
  name: 'display-message',
  aliases: ['display'],
  flags: { p: 'bool' },
  maxArgs: 1,
  requiresServer: true,
  run: (state, args) => ok({ state, output: [expandFormat(state, args.positional[0] ?? DEFAULT_MESSAGE, COMMAND_CLOCK)] }),
}

/** The label tmux shows before a template prompt: its command in parentheses. */
function templateLabel(template: string): string {
  return `(${template.trim().split(/\s+/)[0]})`
}

const commandPrompt: CommandSpec = {
  name: 'command-prompt',
  flags: { I: 'value', p: 'value' },
  maxArgs: 1,
  requiresServer: true,
  run: (state, args) => {
    if (state.isDetached) return fail('state.detached')
    const given = args.positional[0]
    const template = given ?? '%%'
    const label = flagValue(args, 'p') ?? (given === undefined ? ':' : templateLabel(given))
    const prompt = { label, initial: expandNames(state, flagValue(args, 'I') ?? ''), template }
    return ok({ state: { ...state, prompt }, detail: { template } })
  },
}

/** The command a confirm prompt asks about, checked now so a typo fails before anything is asked. */
function confirmedCommand(line: string, table: readonly CommandSpec[]): Result<string> {
  const tokens = tokenize(line)
  if (!tokens.ok) return tokens
  const first = splitCommands(tokens.value)[0]
  if (first === undefined) return fail('parse.tooFewArgs', { command: 'confirm-before' })
  const found = findCommand(first[0], table)
  return found.ok ? ok(found.value.name) : found
}

const confirmBefore: CommandSpec = {
  name: 'confirm-before',
  aliases: ['confirm'],
  flags: { p: 'value' },
  minArgs: 1,
  maxArgs: 1,
  requiresServer: true,
  run: (state, args, ctx) => {
    if (state.isDetached) return fail('state.detached')
    const template = args.positional[0]
    const command = confirmedCommand(template, ctx.commands)
    if (!command.ok) return command
    const given = flagValue(args, 'p')
    const label = given === undefined ? `Confirm '${command.value}'? (y/n)` : expandNames(state, given)
    const prompt = { label, initial: '', template, confirm: true }
    return ok({ state: { ...state, prompt }, detail: { command: template } })
  },
}

export const KEY_COMMANDS: readonly CommandSpec[] = [
  bindKey, unbindKey, listKeys, sendPrefix, displayMessage, commandPrompt, confirmBefore,
]
