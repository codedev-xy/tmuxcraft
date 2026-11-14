import type { TmuxState } from './types'
import type { TmuxError } from './errors'
import { parseArgs } from './argparse'
import { splitCommands, tokenize } from './tokenize'
import { locatePane } from './selectors'
import { appendLog } from './update'
import { findCommand } from './commands/find'
import type { CommandSpec, Engine, ExecContext, ExecResult, RunContext } from './commands/types'

/** What a bare `tmux` runs. */
const DEFAULT_COMMAND = 'new-session'

function failed(state: TmuxState, error: TmuxError): ExecResult {
  return { state, ok: false, output: [], errors: [error] }
}

function argCountError(spec: CommandSpec, count: number): TmuxError | null {
  if (count < (spec.minArgs ?? 0)) return { code: 'parse.tooFewArgs', params: { command: spec.name } }
  if (count > (spec.maxArgs ?? 0)) return { code: 'parse.tooManyArgs', params: { command: spec.name } }
  return null
}

/** Copy mode ends when its pane is gone, whichever command removed it. */
function closeStaleCopyMode(state: TmuxState): TmuxState {
  if (!state.copyMode || locatePane(state, state.copyMode.paneId)) return state
  return { ...state, copyMode: null }
}

/** Runs one command given as words and logs it; a command that fails leaves the state untouched. */
function runCommand(state: TmuxState, words: readonly string[], ctx: ExecContext, fromShell: boolean, engine: Engine): ExecResult {
  const found = findCommand(words[0], engine.commands)
  if (!found.ok) return failed(state, found.error)
  const spec = found.value
  const args = parseArgs(words.slice(1), spec.flags)
  if (!args.ok) return failed(state, args.error)
  const countError = argCountError(spec, args.value.positional.length)
  if (countError) return failed(state, countError)
  if (spec.requiresServer && state.sessions.length === 0) return failed(state, { code: 'session.none' })

  const runContext: RunContext = {
    ...ctx,
    fromShell,
    commands: engine.commands,
    exec: (inner, line, innerCtx) => executeLine(inner, line, innerCtx, engine),
    shell: engine.shell,
  }
  const outcome = spec.run(state, args.value, runContext)
  if (!outcome.ok) return failed(state, outcome.error)
  const { output = [], errors = [], detail } = outcome.value
  const logged = appendLog(closeStaleCopyMode(outcome.value.state), {
    name: spec.name,
    origin: ctx.origin,
    ...(ctx.key === undefined ? {} : { key: ctx.key }),
    ...(ctx.file === undefined ? {} : { file: ctx.file }),
    ...(detail ? { detail } : {}),
  })
  return { state: logged, ok: errors.length === 0, output, errors }
}

/** Runs commands in order and stops after the first one that fails, as tmux does with a `;` sequence. */
function runCommands(
  state: TmuxState,
  commands: readonly (readonly string[])[],
  ctx: ExecContext,
  fromShell: boolean,
  engine: Engine,
): ExecResult {
  let current = state
  let output: readonly string[] = []
  for (const words of commands) {
    const result = runCommand(current, words, ctx, fromShell, engine)
    current = result.state
    output = [...output, ...result.output]
    if (!result.ok) return { state: current, ok: false, output, errors: result.errors }
  }
  return { state: current, ok: true, output, errors: [] }
}

/**
 * Runs a line of tmux commands from inside tmux: the `:` prompt, a key binding, or a config file line.
 * The line is tmux syntax without a leading `tmux`; `;` separates commands and `#` starts a comment.
 */
export function executeLine(state: TmuxState, line: string, ctx: ExecContext, engine: Engine): ExecResult {
  const tokens = tokenize(line)
  if (!tokens.ok) return failed(state, tokens.error)
  return runCommands(state, splitCommands(tokens.value), ctx, false, engine)
}

/**
 * Runs the arguments of a `tmux …` shell command, already split into words by the shell.
 * A word that is exactly `;` (written `\;` in the shell) starts the next command; no words means `new-session`.
 */
export function executeArgv(state: TmuxState, words: readonly string[], ctx: ExecContext, engine: Engine): ExecResult {
  if (words.length === 0) return runCommands(state, [[DEFAULT_COMMAND]], ctx, true, engine)
  const commands = splitCommands(words.map(text => ({ text, separator: text === ';', quoted: false })))
  return runCommands(state, commands, ctx, true, engine)
}
