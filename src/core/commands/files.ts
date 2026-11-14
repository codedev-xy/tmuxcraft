import { ok } from '../errors'
import { hasFlag } from '../argparse'
import { normalizePath } from '../files'
import { runFile } from '../script'
import type { CommandSpec } from './types'

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
