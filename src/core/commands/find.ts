import { fail, ok } from '../errors'
import type { Result } from '../errors'
import type { CommandSpec } from './types'
import { closestWord } from './suggest'
import { TMUX_COMMAND_ALIASES } from './tmux-names'

const TMUX_NAMES = Object.keys(TMUX_COMMAND_ALIASES)

/** Full name of the real tmux command `word` names exactly (by name or alias), null when there is none. */
function tmuxNameOf(word: string): string | null {
  if (Object.hasOwn(TMUX_COMMAND_ALIASES, word)) return word
  return TMUX_NAMES.find(name => TMUX_COMMAND_ALIASES[name] === word) ?? null
}

function supported(name: string, table: readonly CommandSpec[]): Result<CommandSpec> {
  const spec = table.find(candidate => candidate.name === name)
  return spec ? ok(spec) : fail('command.unsupported', { command: name })
}

function unknown(word: string, table: readonly CommandSpec[]): Result<CommandSpec> {
  const suggestion = closestWord(word, table.flatMap(spec => [spec.name, ...(spec.aliases ?? [])]))
  const error = { code: 'parse.unknownCommand', params: { command: word } } as const
  return { ok: false, error: suggestion ? { ...error, suggestion } : error }
}

/**
 * Looks a command up the way tmux does: an exact name or alias, otherwise a prefix that only one
 * tmux command name starts with. A real tmux command the simulator lacks is `command.unsupported`.
 */
export function findCommand(word: string, table: readonly CommandSpec[]): Result<CommandSpec> {
  if (word === '') return unknown(word, table)
  const exact = table.find(spec => spec.name === word || spec.aliases?.includes(word))
  if (exact) return ok(exact)
  const tmuxName = tmuxNameOf(word)
  if (tmuxName) return supported(tmuxName, table)
  const matches = TMUX_NAMES.filter(name => name.startsWith(word))
  if (matches.length === 0) return unknown(word, table)
  if (matches.length > 1) return fail('parse.ambiguousCommand', { command: word, matches })
  return supported(matches[0], table)
}
