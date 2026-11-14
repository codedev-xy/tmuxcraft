import { getOption } from '@/core/options'
import type { KeyId, LogEntry, TmuxState } from '@/core/types'
import type { PlayerInput } from '@/game/sim/simulate'
import type { TranscriptEntry } from './transcript'

/** Commands that only open a prompt; what is answered there is what runs. */
const PROMPT_COMMANDS: readonly string[] = ['command-prompt', 'confirm-before']

/** The binding line the key fired, as written in the key table; null when no table was used (copy mode). */
function bindingLine(state: TmuxState, key: KeyId): string | null {
  const table = state.prefixPending ? state.keyTables.prefix : state.copyMode === null ? state.keyTables.root : null
  return table && Object.hasOwn(table, key) ? table[key] : null
}

function commandNames(entries: readonly LogEntry[]): string {
  return [...new Set(entries.map(entry => entry.name))].join(' ; ')
}

/**
 * The log line telling the player which command a key, click or drag made tmux run; null when it ran
 * nothing, or only opened a prompt.
 */
export function commandEcho(before: TmuxState, input: PlayerInput, after: TmuxState): TranscriptEntry | null {
  if (input.type !== 'key' && input.type !== 'click' && input.type !== 'drag') return null
  const ran = after.log.slice(before.log.length).filter(entry => entry.origin === 'key' || entry.origin === 'mouse')
  if (ran.every(entry => PROMPT_COMMANDS.includes(entry.name))) return null
  if (input.type !== 'key') return { kind: 'command', source: { type: input.type }, command: commandNames(ran) }
  const keys = before.prefixPending ? [getOption(before, 'prefix'), input.key] : [input.key]
  return { kind: 'command', source: { type: 'key', keys }, command: bindingLine(before, input.key) ?? commandNames(ran) }
}
