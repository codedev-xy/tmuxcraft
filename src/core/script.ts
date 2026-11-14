import type { Origin, TmuxState } from './types'
import { fail, ok } from './errors'
import type { Result, TmuxError } from './errors'
import { normalizePath, readFile } from './files'
import type { ExecContext, ExecResult } from './commands/types'

/** How many files (sourced configs, scripts) may run inside each other. */
export const MAX_FILE_DEPTH = 5

export interface FileLine {
  readonly text: string
  /** 1-based number of the physical line the logical line starts on. */
  readonly line: number
}

/** What one line of a file did; `exited` stops the rest of the file (a script's `exit`). */
export interface FileLineResult extends ExecResult {
  readonly exited?: boolean
}

/** Runs one line of a script in a pane; the shell passes its non-echoing runner here. */
export type ScriptLineRunner = (state: TmuxState, paneId: string, line: string, ctx: ExecContext) => FileLineResult

export interface FileRun {
  readonly state: TmuxState
  readonly output: readonly string[]
  readonly errors: readonly TmuxError[]
}

const isComment = (text: string) => text.trimStart().startsWith('#')

/** The lines a config file or script runs: blank and `#` lines dropped, a trailing `\` joining the next line. */
export function fileLines(text: string): FileLine[] {
  const physical = text.split(/\r?\n/)
  const lines: FileLine[] = []
  let i = 0
  while (i < physical.length) {
    const start = i
    let joined = physical[i++]
    if (!isComment(joined)) {
      while (joined.endsWith('\\')) joined = joined.slice(0, -1) + (physical[i++] ?? '')
    }
    if (joined.trim() !== '' && !isComment(joined)) lines.push({ text: joined, line: start + 1 })
  }
  return lines
}

/**
 * Runs every line of a file one level deeper than `ctx`, carrying on past failing lines. Each error is
 * given the file and line it came from, unless an inner file already gave it one.
 */
export function runFile(
  state: TmuxState,
  path: string,
  ctx: ExecContext,
  origin: Origin,
  runLine: (state: TmuxState, line: string, ctx: ExecContext) => FileLineResult,
): Result<FileRun> {
  const normalized = normalizePath(path)
  const depth = (ctx.depth ?? 0) + 1
  if (depth > MAX_FILE_DEPTH) return fail('script.depth', { path: normalized })
  const text = readFile(state, normalized)
  if (!text.ok) return text
  let run: FileRun = { state, output: [], errors: [] }
  for (const { text: line, line: number } of fileLines(text.value)) {
    const result = runLine(run.state, line, { origin, depth })
    const at = { path: normalized, line: number }
    run = {
      state: result.state,
      output: [...run.output, ...result.output],
      errors: [...run.errors, ...result.errors.map(error => (error.at ? error : { ...error, at }))],
    }
    if (result.exited) break
  }
  return ok(run)
}

/** `bash file`: runs the script's lines in the pane without echoing them, as bash does. */
export function runScript(
  state: TmuxState,
  paneId: string,
  path: string,
  ctx: ExecContext,
  runLine: ScriptLineRunner,
): ExecResult {
  const run = runFile(state, path, ctx, 'script', (current, line, lineCtx) => runLine(current, paneId, line, lineCtx))
  if (!run.ok) return { state, ok: false, output: [], errors: [run.error] }
  const { errors } = run.value
  return { state: run.value.state, ok: errors.length === 0, output: run.value.output, errors }
}
