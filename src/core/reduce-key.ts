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
 * tmux; otherwise copy mode replaces the root table, as tmux's copy-mode table does, and keys it does
 * not take go back unhandled. A result that is not `handled` is for the caller to pass on (to the shell
 * line, the prompt, the editor, the browser).
 */
export function reduceKey(state: TmuxState, key: KeyId, engine: Engine): KeyResult {
  const forPrefix = state.prefixPending || key === getOption(state, 'prefix')
  if (forPrefix || !copyModeHasKeys(state)) return handleKey(state, key, engine)
  return { ...copyModeKey(state, key), ok: true, output: [], errors: [] }
}
