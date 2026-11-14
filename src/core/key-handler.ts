import type { KeyId, KeyTable, TmuxState } from './types'
import { executeLine } from './execute'
import { getOption } from './options'
import type { Engine, ExecResult } from './commands/types'

export type KeyResult = ExecResult & {
  /** False when the key is not tmux's to take, so the caller should pass it on (to the shell, the prompt, the editor). */
  readonly handled: boolean
}

function done(state: TmuxState, handled: boolean): KeyResult {
  return { state, ok: true, output: [], errors: [], handled }
}

function bindingFor(table: KeyTable, key: KeyId): string | null {
  return Object.hasOwn(table, key) ? table[key] : null
}

function runBinding(state: TmuxState, binding: string, key: KeyId, engine: Engine): KeyResult {
  return { ...executeLine(state, binding, { origin: 'key', key }, engine), handled: true }
}

/** The key after the prefix: its prefix binding, a silent cancel on Escape, or `key.unbound`. */
function afterPrefix(state: TmuxState, key: KeyId, engine: Engine): KeyResult {
  const cleared = cancelPrefix(state)
  const binding = bindingFor(cleared.keyTables.prefix, key)
  if (binding !== null) return runBinding(cleared, binding, key, engine)
  if (key === 'Escape') return done(cleared, true)
  return { state: cleared, ok: false, output: [], errors: [{ code: 'key.unbound', params: { key } }], handled: true }
}

/**
 * Handles a key pressed while attached: the prefix key, the key after it, or a root-table binding.
 * Copy-mode keys are handled elsewhere; the caller composes the two.
 */
export function handleKey(state: TmuxState, key: KeyId, engine: Engine): KeyResult {
  if (state.isDetached || state.prompt || state.editing !== null) return done(state, false)
  if (state.prefixPending) return afterPrefix(state, key, engine)
  if (key === getOption(state, 'prefix')) return done({ ...state, prefixPending: true }, true)
  const binding = bindingFor(state.keyTables.root, key)
  return binding === null ? done(state, false) : runBinding(state, binding, key, engine)
}

/** Drops a pending prefix, for the UI's timeout. */
export function cancelPrefix(state: TmuxState): TmuxState {
  return state.prefixPending ? { ...state, prefixPending: false } : state
}
