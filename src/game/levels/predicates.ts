import { calculateLayout } from '@/core/layout-engine'
import { findPane, getActiveSession, windowPanes } from '@/core/selectors'
import { tokenize } from '@/core/tokenize'
import type { KeyId, LogEntry, Origin, PaneLayout, Session, TmuxState, Window } from '@/core/types'

// Questions level objectives ask about a state. All of them only read.

const UNIT = { x: 0, y: 0, width: 1, height: 1 }

/** How far a pane edge may be from where an even layout puts it, as a share of the window. */
const TOLERANCE = 0.02

const near = (a: number, b: number): boolean => Math.abs(a - b) <= TOLERANCE

// ===== Finding things =====

export function sessionNamed(state: TmuxState, name: string): Session | null {
  return state.sessions.find(session => session.name === name) ?? null
}

export function windowNamed(session: Session | null, name: string): Window | null {
  return session?.windows.find(window => window.name === name) ?? null
}

/** Pane IDs in layout order: left to right, top to bottom. */
export function paneIds(window: Window): string[] {
  return windowPanes(window).map(pane => pane.id)
}

/** True when the two lists hold the same IDs, in any order. */
export function sameIds(actual: readonly string[], expected: readonly string[]): boolean {
  const have = [...actual].sort()
  const want = [...expected].sort()
  return have.length === want.length && want.every((id, index) => have[index] === id)
}

/** True when the window holds exactly these panes, wherever they sit. */
export function hasPanes(window: Window | null, ids: readonly string[]): boolean {
  return window !== null && sameIds(paneIds(window), ids)
}

/** True when the client is attached to the session named `name`. */
export function attachedTo(state: TmuxState, name: string): boolean {
  return !state.isDetached && getActiveSession(state)?.name === name
}

// ===== Layout shapes =====

function rects(window: Window): PaneLayout[] {
  return calculateLayout(window.layoutTree, UNIT)
}

/** Exactly `count` panes side by side, each as tall as the window. */
export function isRow(window: Window, count: number): boolean {
  const panes = rects(window)
  return panes.length === count && panes.every(pane => near(pane.height, 1))
}

/** Exactly `count` panes stacked, each as wide as the window. */
export function isColumn(window: Window, count: number): boolean {
  const panes = rects(window)
  return panes.length === count && panes.every(pane => near(pane.width, 1))
}

export function isEvenRow(window: Window, count: number): boolean {
  return isRow(window, count) && rects(window).every(pane => near(pane.width, 1 / count))
}

export function isEvenColumn(window: Window, count: number): boolean {
  return isColumn(window, count) && rects(window).every(pane => near(pane.height, 1 / count))
}

/** A grid of equal cells, `columns` across and `rows` down, whatever order it was split in. */
export function isGrid(window: Window, columns: number, rows: number): boolean {
  const panes = rects(window)
  return panes.length === columns * rows
    && panes.every(pane => near(pane.width, 1 / columns) && near(pane.height, 1 / rows))
}

// ===== What happened =====

export interface LogQuery {
  readonly name: string
  readonly origin?: Origin
  readonly key?: KeyId
  /** Path of the config file or script the command must have been a line of. */
  readonly file?: string
  /** The logged line must have these words; how it was spaced and quoted does not matter. */
  readonly line?: string
  /** Every entry here must equal the same entry of the logged detail. */
  readonly detail?: Readonly<Record<string, string>>
}

/** True when two command lines split into the same words and `;` separators. */
export function sameWords(a: string, b: string): boolean {
  const left = tokenize(a)
  const right = tokenize(b)
  if (!left.ok || !right.ok || left.value.length !== right.value.length) return false
  return left.value.every((token, index) =>
    token.text === right.value[index].text && token.separator === right.value[index].separator)
}

/** True when the log entry is what the query asks for. */
export function matches(entry: LogEntry, query: LogQuery): boolean {
  if (entry.name !== query.name) return false
  if (query.origin !== undefined && entry.origin !== query.origin) return false
  if (query.key !== undefined && entry.key !== query.key) return false
  if (query.file !== undefined && entry.file !== query.file) return false
  if (query.line !== undefined && !sameWords(entry.detail?.line ?? '', query.line)) return false
  return Object.entries(query.detail ?? {}).every(([field, value]) => entry.detail?.[field] === value)
}

const asQuery = (query: string | LogQuery): LogQuery => (typeof query === 'string' ? { name: query } : query)

/** True when a matching command ran. Only commands that succeeded are in the log. */
export function ran(state: TmuxState, query: string | LogQuery): boolean {
  return state.log.some(entry => matches(entry, asQuery(query)))
}

/** True when the commands ran one after another in this order, with anything in between. */
export function ranInOrder(state: TmuxState, ...queries: readonly (string | LogQuery)[]): boolean {
  let from = 0
  for (const query of queries.map(asQuery)) {
    const found = state.log.findIndex((entry, index) => index >= from && matches(entry, query))
    if (found < 0) return false
    from = found + 1
  }
  return true
}

// ===== Pane content =====

/** True when a line of the pane's scrollback contains `text`. */
export function paneShows(state: TmuxState, paneId: string, text: string): boolean {
  return findPane(state, paneId)?.content.some(row => row.includes(text)) ?? false
}
