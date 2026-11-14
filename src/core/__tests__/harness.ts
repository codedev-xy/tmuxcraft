import { executeArgv, executeLine } from '../execute'
import type { CommandSpec, Engine, ExecContext, ExecResult, ShellRunner } from '../commands/types'
import type { TmuxError } from '../errors'
import type { TmuxState } from '../types'

export const TYPED: ExecContext = { origin: 'typed' }

/** A shell for engines whose commands never run shell lines. */
const noShell: ShellRunner = () => {
  throw new Error('this test engine has no shell')
}

export function testEngine(commands: readonly CommandSpec[], shell: ShellRunner = noShell): Engine {
  return { commands, shell }
}

function describeErrors(errors: readonly TmuxError[]): string {
  return errors.map(error => `${error.code} ${JSON.stringify(error.params ?? {})}`).join('; ')
}

/** The result of a run that must succeed; throws with the error codes otherwise. */
export function must(result: ExecResult): ExecResult {
  if (!result.ok) throw new Error(`expected success, got: ${describeErrors(result.errors)}`)
  return result
}

/** The first error of a run that must fail. */
export function errorOf(result: ExecResult): TmuxError {
  if (result.ok) throw new Error('expected an error, but the line ran')
  return result.errors[0]
}

/** Runs lines inside tmux one after another; every line must succeed. Returns the final state. */
export function runLines(engine: Engine, state: TmuxState, lines: readonly string[], ctx: ExecContext = TYPED): TmuxState {
  return lines.reduce((current, line) => must(executeLine(current, line, ctx, engine)).state, state)
}

/** Runs `tmux <words>` as a shell would, with the words given as one string split on spaces. */
export function tmux(engine: Engine, state: TmuxState, words: string, ctx: ExecContext = TYPED): ExecResult {
  return executeArgv(state, words === '' ? [] : words.split(' '), ctx, engine)
}
