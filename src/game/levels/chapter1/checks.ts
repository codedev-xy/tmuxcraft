import { getActivePane, getActiveSession, getActiveWindow } from '@/core/selectors'
import type { LayoutNode, TmuxState, Window } from '@/core/types'
import { hasPanes } from '../predicates'

// Questions chapter 1's objectives ask that predicates.ts does not answer.

export function activePaneIs(state: TmuxState, paneId: string): boolean {
  return getActivePane(state)?.id === paneId
}

/** True when the current window still has exactly these panes and `paneId` has focus. */
export function focusedAmong(state: TmuxState, paneId: string, ids: readonly string[]): boolean {
  return hasPanes(getActiveWindow(state), ids) && activePaneIs(state, paneId)
}

/** True when the layout has a split of this direction anywhere. */
export function hasSplit(node: LayoutNode, direction: 'horizontal' | 'vertical'): boolean {
  if (node.type !== 'split' || !node.children) return false
  return node.direction === direction || node.children.some(child => hasSplit(child, direction))
}

/** Windows of the current session; empty when there is none. */
export function sessionWindows(state: TmuxState): readonly Window[] {
  return getActiveSession(state)?.windows ?? []
}

/** The current session's window at `index`, when its ID and name are both as given. */
export function windowIs(state: TmuxState, index: number, id: string, name: string): boolean {
  const window = sessionWindows(state)[index]
  return window?.id === id && window.name === name
}
