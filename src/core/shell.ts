import type { TmuxState } from './types'
import { fail, ok } from './errors'
import type { Result, TmuxError } from './errors'
import { tokenize } from './tokenize'
import type { Token } from './tokenize'
import { executeArgv, executeLine } from './execute'
import { findPane, getActiveWindow, shellPaneId, windowPanes } from './selectors'
import { appendLog, appendPaneLines, removePane } from './update'
import { runScript } from './script'
import type { FileLineResult, ScriptLineRunner } from './script'
import { BUILTIN_NAMES, findBuiltin, missingOperand, step } from './shell-builtins'
import type { ShellStep } from './shell-builtins'
import { closestWord } from './commands/suggest'
import type { Engine, ExecContext, ExecResult } from './commands/types'

/** Shell operators the simulator does not model; a player who means them literally must quote them. */
const UNSUPPORTED_OPERATORS: ReadonlySet<string> = new Set([
  '|', '||', '&', '>', '>>', '<', '<<', '|&', '&>', '2>', '2>&1',
])
const AND = '&&'

/** What a mistyped command may have meant; `tmux` comes first so that it wins a tie. */
const SUGGESTED_COMMANDS: readonly string[] = ['tmux', 'exit', 'bash', ...BUILTIN_NAMES]

interface ShellCommand {
  readonly words: readonly string[]
  /** True after `&&`: runs only when the command before it succeeded. */
  readonly onlyIfOk: boolean
}

/** What every command of one line shares. */
interface LineEnv {
  readonly paneId: string
  readonly ctx: ExecContext
  readonly engine: Engine
  /** False for a script line: not echoed, and `exit` ends the script instead of the pane's shell. */
  readonly interactive: boolean
}

const isOperator = (token: Token, text: string) => !token.quoted && !token.separator && token.text === text

/** Splits a line's tokens into commands at `;` and `&&`; any other operator refuses the whole line. */
function parseCommands(tokens: readonly Token[]): Result<ShellCommand[]> {
  const unsupported = tokens.find(token => !token.quoted && !token.separator && UNSUPPORTED_OPERATORS.has(token.text))
  if (unsupported) return fail('shell.unsupported', { token: unsupported.text })
  const commands: ShellCommand[] = []
  let words: string[] = []
  let onlyIfOk = false
  for (const token of tokens) {
    const and = isOperator(token, AND)
    if (!token.separator && !and) {
      words.push(token.text)
      continue
    }
    if (words.length > 0) commands.push({ words, onlyIfOk })
    words = []
    onlyIfOk = and
  }
  if (words.length > 0) commands.push({ words, onlyIfOk })
  return ok(commands)
}

function commandNotFound(command: string): TmuxError {
  const error: TmuxError = { code: 'shell.commandNotFound', params: { command } }
  const suggestion = closestWord(command, SUGGESTED_COMMANDS)
  return suggestion === undefined ? error : { ...error, suggestion }
}

function runTmux(state: TmuxState, args: readonly string[], env: LineEnv): ShellStep {
  const result = executeArgv(state, args, env.ctx, env.engine)
  return step(appendPaneLines(result.state, env.paneId, result.output), result.errors)
}

/** `exit` closes the pane's shell; in a script it only ends the script, and outside tmux it does nothing. */
function exitShell(state: TmuxState, { paneId, interactive }: LineEnv): ShellStep {
  const closed = interactive && paneId !== state.outer.id ? removePane(state, paneId) : state
  return { state: closed, errors: [], exited: true }
}

function runBash(state: TmuxState, name: string, args: readonly string[], env: LineEnv): ShellStep {
  if (args.length === 0) return missingOperand(state, name)
  const quiet: ScriptLineRunner = (current, paneId, line, ctx) => runQuietLine(current, paneId, line, ctx, env.engine)
  const result = runScript(state, env.paneId, args[0], env.ctx, quiet)
  return step(result.state, result.errors)
}

function runCommand(state: TmuxState, words: readonly string[], env: LineEnv): ShellStep {
  const [name, ...args] = words
  if (name === 'tmux') return runTmux(state, args, env)
  if (name === 'exit') return exitShell(state, env)
  if (name === 'bash' || name === 'sh') return runBash(state, name, args, env)
  const builtin = findBuiltin(name)
  if (builtin) return builtin(state, env.paneId, args, name)
  return step(state, [commandNotFound(name)])
}

function runCommands(state: TmuxState, commands: readonly ShellCommand[], env: LineEnv): ShellStep {
  let current = step(state)
  let lastOk = true
  for (const command of commands) {
    if (command.onlyIfOk && !lastOk) continue
    const ran = runCommand(current.state, command.words, env)
    current = { ...ran, errors: [...current.errors, ...ran.errors] }
    lastOk = ran.errors.length === 0
    if (ran.exited) return current
  }
  return current
}

/** Runs a line in a pane, echoing it first when typed interactively; null for a line with nothing to run. */
function runLine(state: TmuxState, line: string, env: LineEnv): ShellStep | null {
  const { paneId, ctx } = env
  const tokens = tokenize(line)
  if (tokens.ok && tokens.value.every(token => token.separator)) return null
  const echoed = env.interactive ? appendPaneLines(state, paneId, [`$ ${line}`]) : state
  const commands = tokens.ok ? parseCommands(tokens.value) : tokens
  const ran = commands.ok ? runCommands(echoed, commands.value, env) : step(echoed, [commands.error])
  const logged = appendLog(ran.state, {
    name: 'shell',
    origin: ctx.origin,
    ...(ctx.file === undefined ? {} : { file: ctx.file }),
    detail: { pane: paneId, line },
  })
  return { ...ran, state: logged }
}

function toResult(state: TmuxState, ran: ShellStep | null): ExecResult {
  if (!ran) return { state, ok: true, output: [], errors: [] }
  return { state: ran.state, ok: ran.errors.length === 0, output: [], errors: ran.errors }
}

/** A script line: run like a typed line, but not echoed. */
function runQuietLine(state: TmuxState, paneId: string, line: string, ctx: ExecContext, engine: Engine): FileLineResult {
  const ran = runLine(state, line, { paneId, ctx, engine, interactive: false })
  return { ...toResult(state, ran), exited: ran?.exited ?? false }
}

/**
 * Runs `line` as if typed at the shell prompt of a pane (or of the terminal outside tmux) and Enter was pressed.
 * Everything printed goes into the pane; errors come back as codes and are not printed.
 */
export function runShellLine(state: TmuxState, paneId: string, line: string, ctx: ExecContext, engine: Engine): ExecResult {
  return toResult(state, runLine(state, line, { paneId, ctx, engine, interactive: true }))
}

function isTmuxLine(line: string): boolean {
  const tokens = tokenize(line)
  const first = tokens.ok ? tokens.value.find(token => !token.separator) : undefined
  return first !== undefined && !first.quoted && first.text === 'tmux'
}

/** Types a line into every pane of a synchronized window, skipping panes an earlier pane closed. */
function broadcast(state: TmuxState, paneIds: readonly string[], line: string, ctx: ExecContext, engine: Engine): ExecResult {
  return paneIds.reduce<ExecResult>((merged, paneId) => {
    if (!findPane(merged.state, paneId)) return merged
    const result = runShellLine(merged.state, paneId, line, ctx, engine)
    const errors = [...merged.errors, ...result.errors]
    return { state: result.state, ok: errors.length === 0, output: [], errors }
  }, { state, ok: true, output: [], errors: [] })
}

/** What the game's command box runs: a shell line, or a tmux command after `:` (tmux's command prompt). */
export function submitLine(state: TmuxState, line: string, engine: Engine): ExecResult {
  const ctx: ExecContext = { origin: 'typed' }
  if (state.isDetached) return runShellLine(state, state.outer.id, line, ctx, engine)
  const trimmed = line.trimStart()
  if (trimmed.startsWith(':')) return executeLine(state, trimmed.slice(1), ctx, engine)
  const window = getActiveWindow(state)
  if (!window?.synchronizePanes || isTmuxLine(line)) return runShellLine(state, shellPaneId(state), line, ctx, engine)
  return broadcast(state, windowPanes(window).map(pane => pane.id), line, ctx, engine)
}
