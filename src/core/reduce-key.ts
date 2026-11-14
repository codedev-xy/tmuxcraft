import type { KeyId, TmuxState } from './types'
import { copyModeKey } from './copy-mode'
import { handleKey } from './key-handler'
import type { KeyResult } from './key-handler'
import { getOption } from './options'
import { getActivePane } from './selectors'
import type { Engine } from './commands/types'

/** True when the pane on screen is the one in copy mode and nothing modal sits on top of it. */
function copyModeHasKeys(state: TmuxState): boolean {
  if (state.isDetached || state.prompt || state.editing !== null) return false
  return state.copyMode !== null && state.copyMode.paneId === getActivePane(state)?.id
}

/**
 * Every key the player presses goes through here. The prefix and the key after it always belong to
 * tmux; otherwise copy mode takes every key in place of the root table, as tmux's copy-mode table does.
 * A result that is not `handled` is for the caller to pass on (to the shell line, the prompt, the editor).
 */
export function reduceKey(state: TmuxState, key: KeyId, engine: Engine): KeyResult {
  const forPrefix = state.prefixPending || key === getOption(state, 'prefix')
  if (forPrefix || !copyModeHasKeys(state)) return handleKey(state, key, engine)
  return { state: copyModeKey(state, key).state, ok: true, output: [], errors: [], handled: true }
}
