import type { TmuxError } from '@/core/errors'
import type { KeyId } from '@/core/types'

/** What made tmux run a command without anything being typed. */
export type CommandSource =
  | { readonly type: 'key'; readonly keys: readonly KeyId[] }
  | { readonly type: 'click' }
  | { readonly type: 'drag' }

/** One line of the log under the terminal: what was typed, what a key or the mouse ran, what came back, what went wrong. */
export type TranscriptEntry =
  | { readonly kind: 'input'; readonly text: string }
  | { readonly kind: 'command'; readonly source: CommandSource; readonly command: string }
  | { readonly kind: 'output'; readonly text: string }
  | { readonly kind: 'error'; readonly error: TmuxError }
