export const ERROR_CODES = [
  'parse.empty',
  'parse.unknownCommand',
  'parse.unknownFlag',
  'parse.missingArg',
  'parse.tooManyArgs',
  'parse.badNumber',
  'parse.unterminatedQuote',
  'target.sessionNotFound',
  'target.windowNotFound',
  'target.paneNotFound',
  'session.none',
  'session.duplicate',
  'session.nested',
  'state.detached',
  'pane.onlyOne',
  'window.indexInUse',
  'layout.unknown',
  'option.unknown',
  'option.badValue',
  'key.invalid',
  'key.reserved',
  'key.unbound',
  'file.notFound',
  'script.depth',
  'shell.commandNotFound',
  'buffer.empty',
  'command.unsupported',
] as const

export type ErrorCode = typeof ERROR_CODES[number]

export type ErrorParams = Readonly<Record<string, string | number>>

/** An error the UI translates through `errors.<code>`; core never produces user-facing prose. */
export interface TmuxError {
  readonly code: ErrorCode
  readonly params?: ErrorParams
  /** The closest known command name, for "did you mean". */
  readonly suggestion?: string
  /** Set when the failing line came from a sourced file or script. */
  readonly at?: { readonly path: string; readonly line: number }
}

export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: TmuxError }

export function ok<T>(value: T): Result<T> {
  return { ok: true, value }
}

export function fail(code: ErrorCode, params?: ErrorParams): { readonly ok: false; readonly error: TmuxError } {
  return { ok: false, error: params ? { code, params } : { code } }
}
