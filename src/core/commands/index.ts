import type { CommandSpec } from './types'
import { SESSION_COMMANDS } from './session'
import { WINDOW_COMMANDS } from './window'
import { PANE_COMMANDS } from './pane'
import { LAYOUT_COMMANDS } from './layout'
import { OPTION_COMMANDS } from './options'
import { KEY_COMMANDS } from './keys'
import { FILE_COMMANDS } from './files'
import { BUFFER_COMMANDS } from './buffer'
import { SEND_KEYS_COMMANDS } from './send-keys'

/** Every command the simulator runs; `tmux <cmd>`, the `:` prompt, key bindings and config files all share it. */
export const COMMANDS: readonly CommandSpec[] = [
  ...SESSION_COMMANDS,
  ...WINDOW_COMMANDS,
  ...PANE_COMMANDS,
  ...LAYOUT_COMMANDS,
  ...OPTION_COMMANDS,
  ...KEY_COMMANDS,
  ...FILE_COMMANDS,
  ...BUFFER_COMMANDS,
  ...SEND_KEYS_COMMANDS,
]
