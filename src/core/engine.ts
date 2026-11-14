import { COMMANDS } from './commands'
import type { Engine } from './commands/types'
import { runShellLine } from './shell'

/** The simulator as the game runs it: the whole command table, and the shell that `tmux …` lines are typed into. */
export const ENGINE: Engine = {
  commands: COMMANDS,
  shell: (state, paneId, line, ctx) => runShellLine(state, paneId, line, ctx, ENGINE),
}
