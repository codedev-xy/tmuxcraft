import { hasFlag, parseArgs } from '@/core/argparse'
import type { ParsedArgs } from '@/core/argparse'
import { findCommand } from '@/core/commands/find'
import { ENGINE } from '@/core/engine'
import { normalizePath } from '@/core/files'
import { OPTIONS } from '@/core/options'
import { splitCommands, tokenize } from '@/core/tokenize'
import type { KeyId, LogEntry, TmuxState, Window } from '@/core/types'
import { matches, paneIds, ran, sessionNamed, windowNamed } from '../predicates'
import type { LogQuery } from '../predicates'

// Questions chapter 3 asks about key bindings, config files and scripts.

export const CONF = '~/.tmux.conf'

interface BoundCommand {
  /** Canonical command name, whatever alias the binding used. */
  readonly name: string
  readonly args: ParsedArgs
}

/** The first command a prefix-table key runs, parsed as tmux would; null when the key is unbound. */
export function boundCommand(state: TmuxState, key: KeyId): BoundCommand | null {
  if (!Object.hasOwn(state.keyTables.prefix, key)) return null
  const tokens = tokenize(state.keyTables.prefix[key])
  if (!tokens.ok) return null
  const [words] = splitCommands(tokens.value)
  if (!words || words.length === 0) return null
  const spec = findCommand(words[0], ENGINE.commands)
  if (!spec.ok) return null
  const args = parseArgs(words.slice(1), spec.value.flags)
  return args.ok ? { name: spec.value.name, args: args.value } : null
}

/** True when `Prefix key` splits the pane side by side (`split-window -h`). */
export function bindsSideSplit(state: TmuxState, key: KeyId): boolean {
  const bound = boundCommand(state, key)
  return bound?.name === 'split-window' && hasFlag(bound.args, 'h')
}

/** True when `Prefix key` sources the file at `path`. */
export function bindsSource(state: TmuxState, key: KeyId, path: string): boolean {
  const bound = boundCommand(state, key)
  const file = bound?.args.positional[0]
  return bound?.name === 'source-file' && file !== undefined && normalizePath(file) === path
}

/** The global option was set to `value` at some point, by a command of this origin if given. */
export function setOption(option: string, value: string, origin?: LogQuery['origin']): LogQuery {
  return { name: 'set-option', ...(origin ? { origin } : {}), detail: { option, value } }
}

/** The global option was set to `value` by a line of the config file at `path`. */
export function setByFile(option: string, value: string, path: string): LogQuery {
  return { ...setOption(option, value, 'config'), file: path }
}

/**
 * The side-by-side splits made by pressing `key` while the prefix was `prefix`, oldest first.
 * The prefix is followed through the log, so a press made while it was switched to something else is left out.
 */
export function sideSplitsByKey(state: TmuxState, key: KeyId, prefix: KeyId): LogEntry[] {
  const split: LogQuery = { name: 'split-window', origin: 'key', key, detail: { direction: 'h' } }
  let current = OPTIONS.prefix.default
  const found: LogEntry[] = []
  for (const entry of state.log) {
    if (entry.name === 'set-option' && entry.detail?.option === 'prefix') current = entry.detail.value
    else if (current === prefix && matches(entry, split)) found.push(entry)
  }
  return found
}

/** True when a matching command ran on a pane of `window` (its logged `pane` detail). */
export function ranOnWindow(state: TmuxState, query: LogQuery, window: Window | null): boolean {
  if (!window) return false
  const panes = paneIds(window)
  return panes.some(pane => ran(state, { ...query, detail: { ...query.detail, pane } }))
}

/** The window of session `session` named `name`, or null. */
export function windowOf(state: TmuxState, session: string, name: string): Window | null {
  return windowNamed(sessionNamed(state, session), name)
}

/** True when a script (`bash file`) created the session named `name`. */
export function scriptCreated(state: TmuxState, name: string): boolean {
  return sessionNamed(state, name) !== null && ran(state, { name: 'new-session', origin: 'script', detail: { name } })
}
