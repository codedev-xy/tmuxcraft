import type { TmuxState } from './types'
import { executeLine } from './execute'
import { quoteWords } from './tokenize'
import type { Engine, ExecResult } from './commands/types'

/** A quoted `'%%'` or `"%%"` placeholder, or a bare `%%`. */
const PLACEHOLDER = /'%%'|"%%"|%%/g

/**
 * Puts the input into the template. A quoted placeholder becomes the input as one quoted word, so a
 * name with spaces or quotes stays one argument; a bare one takes the raw text, which is how the `:`
 * prompt runs a whole typed line.
 */
function fillTemplate(template: string, text: string): string {
  return template.replace(PLACEHOLDER, placeholder => (placeholder === '%%' ? text : quoteWords([text])))
}

export function cancelPrompt(state: TmuxState): TmuxState {
  return state.prompt ? { ...state, prompt: null } : state
}

/** Closes the prompt and runs its template with `text` filled in; empty input only closes it. */
export function submitPrompt(state: TmuxState, text: string, engine: Engine): ExecResult {
  const { prompt } = state
  const closed = cancelPrompt(state)
  if (!prompt || text === '') return { state: closed, ok: true, output: [], errors: [] }
  return executeLine(closed, fillTemplate(prompt.template, text), { origin: 'typed' }, engine)
}
