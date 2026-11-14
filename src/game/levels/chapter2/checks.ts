import { calculateLayout } from '@/core/layout-engine'
import type { LogEntry, TmuxState, Window } from '@/core/types'
import { sameIds, sameWords } from '../predicates'

// Questions chapter 2 asks that predicates.ts does not answer yet.

/** Share of the window's width taken by the leftmost pane (0 to 1). */
export function leftPaneShare(window: Window): number {
  return calculateLayout(window.layoutTree, { x: 0, y: 0, width: 1, height: 1 })[0]?.width ?? 0
}

const isSyncOn = (entry: LogEntry): boolean =>
  entry.detail?.option === 'synchronize-panes' && entry.detail.value === 'on'

/** Log position of the last time synchronize-panes was turned on, -1 if never. */
export function lastSyncOn(state: TmuxState): number {
  return state.log.reduce((last, entry, index) => (isSyncOn(entry) ? index : last), -1)
}

/**
 * True when `command` ran in every one of `paneIds` as one burst of shell entries after log position `from`,
 * however it was spaced or quoted.
 * A synchronized window logs a typed line once per pane back to back; typing pane by pane puts other entries between.
 */
export function broadcastAfter(state: TmuxState, from: number, command: string, paneIds: readonly string[]): boolean {
  const size = paneIds.length
  for (let start = Math.max(from + 1, 0); start + size <= state.log.length; start++) {
    const burst = state.log.slice(start, start + size)
    const sameLine = burst.every(entry => entry.name === 'shell' && sameWords(entry.detail?.line ?? '', command))
    if (sameLine && sameIds(burst.map(entry => entry.detail?.pane ?? ''), paneIds)) return true
  }
  return false
}
