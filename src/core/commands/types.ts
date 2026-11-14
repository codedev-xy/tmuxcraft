import type { KeyId, Origin, TmuxState } from '../types'
import type { Result, TmuxError } from '../errors'
import type { FlagSpec, ParsedArgs } from '../argparse'

/** How a command line reached tmux. */
export interface ExecContext {
  readonly origin: Origin
  /** The key that fired the binding when `origin` is `key`. */
  readonly key?: KeyId
  /** How many files (sourced configs, scripts) deep this line is; 0 or absent at the top. */
  readonly depth?: number
}

export interface ExecResult {
  readonly state: TmuxState
  /** False when a command failed; `state` still holds everything that ran before it, and the rest of the line did not run. */
  readonly ok: boolean
  /** Lines tmux printed (`list-sessions`, `list-keys`), in order. */
  readonly output: readonly string[]
  readonly errors: readonly TmuxError[]
}

/** Runs `line` in the shell of a pane, as if it was typed there and Enter was pressed. */
export type ShellRunner = (state: TmuxState, paneId: string, line: string, ctx: ExecContext) => ExecResult

/** What running a line needs. Passed in rather than imported, so command files depend on neither the table nor the shell. */
export interface Engine {
  readonly commands: readonly CommandSpec[]
  readonly shell: ShellRunner
}

/** What a command gets besides its arguments. */
export interface RunContext extends ExecContext {
  /**
   * True when the command was invoked as `tmux …` from a shell, false when it ran inside tmux
   * (command prompt, key binding, config file). Only a shell invocation can nest or attach.
   */
  readonly fromShell: boolean
  /** The whole command table, for commands that check or list command names (`bind-key`). */
  readonly commands: readonly CommandSpec[]
  /** Runs a command line inside tmux, for commands that run commands (`source-file`). */
  readonly exec: (state: TmuxState, line: string, ctx: ExecContext) => ExecResult
  /** Runs a shell line in a pane, for commands that press Enter in one (`send-keys`). */
  readonly shell: ShellRunner
}

export interface CommandOutcome {
  readonly state: TmuxState
  readonly output?: readonly string[]
  /**
   * Errors from lines the command ran itself (a sourced file). The command still counts as run and is
   * logged, but the result is not ok and the rest of the line does not run.
   */
  readonly errors?: readonly TmuxError[]
  /** Extra facts for the command's log entry, for validators. */
  readonly detail?: Readonly<Record<string, string>>
}

export interface CommandSpec {
  /** Canonical tmux name (`split-window`); this is what the log records. */
  readonly name: string
  /** tmux's own alias for the command (`splitw`). */
  readonly aliases?: readonly string[]
  readonly flags: FlagSpec
  /** Fewest positional arguments accepted; 0 when absent. */
  readonly minArgs?: number
  /** Most positional arguments accepted; 0 when absent, `Infinity` for a command that takes the rest of its words. */
  readonly maxArgs?: number
  /** True when the command fails with `session.none` unless at least one session exists. */
  readonly requiresServer: boolean
  /**
   * Returns the new state. It must not log itself: the executor appends the log entry after a
   * successful run, so commands run through `ctx.exec` are logged before the command that ran them.
   */
  readonly run: (state: TmuxState, args: ParsedArgs, ctx: RunContext) => Result<CommandOutcome>
}
