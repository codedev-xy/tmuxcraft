import type { TmuxState } from '../types'
import { ok } from '../errors'
import { hasFlag } from '../argparse'
import { normalizePath } from '../files'
import { runFile } from '../script'
import type { FileRun } from '../script'
import { HOME } from '../state'
import type { CommandSpec, RunContext } from './types'

/** The file a starting tmux server reads. */
export const STARTUP_CONFIG = `${HOME}/.tmux.conf`

/** Runs `~/.tmux.conf`, if there is one, as a starting server does. Its lines are logged as config lines; the load itself is not. */
export function loadStartupConfig(state: TmuxState, ctx: RunContext): FileRun {
  if (!Object.hasOwn(state.files, STARTUP_CONFIG)) return { state, output: [], errors: [] }
  const run = runFile(state, STARTUP_CONFIG, ctx, 'config', (current, line, lineCtx) => ctx.exec(current, line, lineCtx))
  return run.ok ? run.value : { state, output: [], errors: [run.error] }
}

/** `source-file [-q] path`: runs each line of a file as a config line, carrying on past lines that fail. */
const sourceFile: CommandSpec = {
  name: 'source-file',
  aliases: ['source'],
  flags: { q: 'bool' },
  minArgs: 1,
  maxArgs: 1,
  requiresServer: true,
  run: (state, args, ctx) => {
    const path = normalizePath(args.positional[0])
    const detail = { path }
    const run = runFile(state, path, ctx, 'config', (current, line, lineCtx) => ctx.exec(current, line, lineCtx))
    if (run.ok) return ok({ ...run.value, detail })
    return run.error.code === 'file.notFound' && hasFlag(args, 'q') ? ok({ state, detail }) : run
  },
}

export const FILE_COMMANDS: readonly CommandSpec[] = [sourceFile]
