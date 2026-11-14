import { ENGINE } from '@/core/engine'
import type { TmuxError } from '@/core/errors'
import { saveFile } from '@/core/files'
import { clickPane, dragBorder } from '@/core/mouse'
import { submitPrompt } from '@/core/prompt'
import { reduceKey } from '@/core/reduce-key'
import { submitLine } from '@/core/shell'
import type { Direction, KeyId, LogEntry, TmuxState } from '@/core/types'

/** One thing the player did. Levels' reference solutions and the UI both speak this. */
export type PlayerInput =
  /** Enter in the command box. */
  | { readonly type: 'line'; readonly text: string }
  /** Enter in an open tmux prompt (`Ctrl+b ,`, `Ctrl+b :`). */
  | { readonly type: 'prompt'; readonly text: string }
  | { readonly type: 'key'; readonly key: KeyId }
  | { readonly type: 'click'; readonly paneId: string }
  | { readonly type: 'drag'; readonly paneId: string; readonly direction: Direction; readonly cells: number }
  /** Saving from the editor. */
  | { readonly type: 'save'; readonly path: string; readonly text: string }

export interface InputResult {
  readonly state: TmuxState
  readonly ok: boolean
  readonly output: readonly string[]
  readonly errors: readonly TmuxError[]
  /** False when tmux did not take the key or click, so the browser keeps it. */
  readonly handled: boolean
  /** True when the input counts towards the level's command count. */
  readonly counted: boolean
}

export interface SimulationResult {
  readonly state: TmuxState
  /** How many of the inputs counted. */
  readonly steps: number
  readonly results: readonly InputResult[]
}

type Outcome = Omit<InputResult, 'counted'>

function run(state: TmuxState, input: PlayerInput): Outcome {
  switch (input.type) {
    case 'line': return { ...submitLine(state, input.text, ENGINE), handled: true }
    case 'prompt': return { ...submitPrompt(state, input.text, ENGINE), handled: true }
    case 'key': return reduceKey(state, input.key, ENGINE)
    case 'click': return clickPane(state, input.paneId, ENGINE)
    case 'drag': return dragBorder(state, input.paneId, input.direction, input.cells, ENGINE)
    case 'save': return { state: saveFile(state, input.path, input.text), ok: true, output: [], errors: [], handled: true }
  }
}

/**
 * An input is one step when it made something happen: it added to the command log. Opening a prompt
 * is not a step (what is typed into it is), and neither is a shell line that only failed, so a typo
 * costs nothing while a line that changed tmux before failing still counts.
 */
function isStep(added: readonly LogEntry[], ok: boolean): boolean {
  const ran = added.filter(entry => entry.name !== 'command-prompt')
  return ran.some(entry => entry.name !== 'shell') || (ok && ran.length > 0)
}

export function applyInput(state: TmuxState, input: PlayerInput): InputResult {
  const outcome = run(state, input)
  return { ...outcome, counted: isStep(outcome.state.log.slice(state.log.length), outcome.ok) }
}

export function simulate(state: TmuxState, inputs: readonly PlayerInput[]): SimulationResult {
  const results: InputResult[] = []
  let current = state
  for (const input of inputs) {
    const result = applyInput(current, input)
    results.push(result)
    current = result.state
  }
  return { state: current, steps: results.filter(result => result.counted).length, results }
}
