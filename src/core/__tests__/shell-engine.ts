import type { KeyId, Pane, TmuxState } from '../types'
import { ENGINE } from '../engine'
import { reduceKey } from '../reduce-key'
import { findPane } from '../selectors'
import { submitLine } from '../shell'
import { must } from './harness'

export { ENGINE }

export function paneOf(state: TmuxState, paneId: string): Pane {
  const pane = findPane(state, paneId)
  if (!pane) throw new Error(`no pane ${paneId}`)
  return pane
}

export function contentOf(state: TmuxState, paneId: string): string[] {
  return paneOf(state, paneId).content
}

export function withFiles(state: TmuxState, files: Readonly<Record<string, string>>): TmuxState {
  return { ...state, files: { ...state.files, ...files } }
}

export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    Object.values(value).forEach(deepFreeze)
  }
  return value
}

export function logNames(state: TmuxState): string[] {
  return state.log.map(entry => entry.name)
}

/** Types lines into the game's command box one after another; every line must succeed. */
export function typeLines(state: TmuxState, ...lines: string[]): TmuxState {
  return lines.reduce((current, line) => must(submitLine(current, line, ENGINE)).state, state)
}

/** Presses keys one after another; every key must be tmux's and must succeed. */
export function pressKeys(state: TmuxState, ...keys: KeyId[]): TmuxState {
  return keys.reduce((current, key) => {
    const result = reduceKey(current, key, ENGINE)
    if (!result.handled) throw new Error(`tmux did not take the key ${key}`)
    return must(result).state
  }, state)
}
