import { useCallback, useRef, useState } from 'react'
import type { TmuxError } from '@/core/errors'
import type { TmuxState } from '@/core/types'
import { applyInput } from '@/game/sim/simulate'
import type { InputResult, PlayerInput } from '@/game/sim/simulate'

export const TRANSCRIPT_LIMIT = 200

/** One line of the log under the terminal: what was typed, what came back, what went wrong. */
export type TranscriptEntry =
  | { readonly kind: 'input'; readonly text: string }
  | { readonly kind: 'output'; readonly text: string }
  | { readonly kind: 'error'; readonly error: TmuxError }

export interface TmuxSession {
  readonly state: TmuxState
  readonly transcript: readonly TranscriptEntry[]
  /** Applies one player input and hands back what it did. */
  readonly send: (input: PlayerInput) => InputResult
  /** Changes the state without it being an input (closing a prompt, the prefix timing out). */
  readonly update: (change: (state: TmuxState) => TmuxState) => void
}

interface Snapshot {
  readonly state: TmuxState
  readonly transcript: readonly TranscriptEntry[]
}

function record(transcript: readonly TranscriptEntry[], input: PlayerInput, result: InputResult): readonly TranscriptEntry[] {
  const echo: TranscriptEntry[] = input.type === 'line' && input.text.trim() !== '' ? [{ kind: 'input', text: input.text }] : []
  const output = result.output.map((text): TranscriptEntry => ({ kind: 'output', text }))
  const errors = result.errors.map((error): TranscriptEntry => ({ kind: 'error', error }))
  const added = [...echo, ...output, ...errors]
  return added.length === 0 ? transcript : [...transcript, ...added].slice(-TRANSCRIPT_LIMIT)
}

/**
 * A running tmux simulation. The initial state is read once; to start over, remount (give the
 * component that calls this a new `key`).
 */
export function useTmuxSession(initial: TmuxState | (() => TmuxState)): TmuxSession {
  const [snapshot, setSnapshot] = useState<Snapshot>(() => ({
    state: typeof initial === 'function' ? initial() : initial,
    transcript: [],
  }))
  // Inputs can arrive faster than React renders (prefix, then the key after it), so each one builds on this.
  const latest = useRef(snapshot)

  const commit = useCallback((next: Snapshot) => {
    latest.current = next
    setSnapshot(next)
  }, [])

  const send = useCallback((input: PlayerInput): InputResult => {
    const current = latest.current
    const result = applyInput(current.state, input)
    const transcript = record(current.transcript, input, result)
    if (result.state !== current.state || transcript !== current.transcript) commit({ state: result.state, transcript })
    return result
  }, [commit])

  const update = useCallback((change: (state: TmuxState) => TmuxState) => {
    const current = latest.current
    const state = change(current.state)
    if (state !== current.state) commit({ ...current, state })
  }, [commit])

  return { state: snapshot.state, transcript: snapshot.transcript, send, update }
}
