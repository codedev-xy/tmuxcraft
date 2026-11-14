import type { CopyModeState, KeyId, Position, TmuxState } from './types'
import { findPane } from './selectors'
import { appendLog } from './update'

type Move = (cursor: Position) => Position

const MOVES: Readonly<Record<KeyId, Move>> = {
  Up: ({ row, col }) => ({ row: row - 1, col }),
  k: ({ row, col }) => ({ row: row - 1, col }),
  Down: ({ row, col }) => ({ row: row + 1, col }),
  j: ({ row, col }) => ({ row: row + 1, col }),
  Left: ({ row, col }) => ({ row, col: col - 1 }),
  h: ({ row, col }) => ({ row, col: col - 1 }),
  Right: ({ row, col }) => ({ row, col: col + 1 }),
  l: ({ row, col }) => ({ row, col: col + 1 }),
  '0': ({ row }) => ({ row, col: 0 }),
  '^': ({ row }) => ({ row, col: 0 }),
  $: ({ row }) => ({ row, col: Infinity }),
  g: () => ({ row: 0, col: 0 }),
  G: () => ({ row: Infinity, col: 0 }),
}

const SELECT_KEYS: readonly KeyId[] = ['Space', 'v', 'C-Space']
const COPY_KEYS: readonly KeyId[] = ['Enter', 'y', 'M-w']
const EXIT_KEYS: readonly KeyId[] = ['q', 'Escape']

const lastIndex = (length: number) => Math.max(0, length - 1)
const clamp = (value: number, max: number) => Math.min(Math.max(value, 0), max)

function contentOf(state: TmuxState, mode: CopyModeState): readonly string[] {
  return findPane(state, mode.paneId)?.content ?? []
}

/** Keeps the cursor on a row that exists and on a character of that row (column 0 on an empty row). */
function clampPosition(lines: readonly string[], { row, col }: Position): Position {
  const clampedRow = clamp(row, lastIndex(lines.length))
  return { row: clampedRow, col: clamp(col, lastIndex(lines[clampedRow]?.length ?? 0)) }
}

const before = (a: Position, b: Position) => a.row < b.row || (a.row === b.row && a.col <= b.col)

function ordered(anchor: Position, cursor: Position): { start: Position; end: Position } {
  return before(anchor, cursor) ? { start: anchor, end: cursor } : { start: cursor, end: anchor }
}

/** The text from `start` to `end`, both included, lines joined by newlines. */
function selectedText(lines: readonly string[], start: Position, end: Position): string {
  const rows = Array.from({ length: end.row - start.row + 1 }, (_, i) => start.row + i)
  return rows
    .map(row => {
      const line = lines[row] ?? ''
      const from = row === start.row ? start.col : 0
      return row === end.row ? line.slice(from, end.col + 1) : line.slice(from)
    })
    .join('\n')
}

/** Starts copy mode in a pane: cursor at the start of its last line, nothing selected. */
export function enterCopyMode(state: TmuxState, paneId: string): TmuxState {
  const pane = findPane(state, paneId)
  if (!pane) return state
  return { ...state, copyMode: { paneId, cursor: { row: lastIndex(pane.content.length), col: 0 }, anchor: null } }
}

function copySelection(state: TmuxState, mode: CopyModeState, key: KeyId): TmuxState {
  const left = { ...state, copyMode: null }
  if (!mode.anchor) return left
  const { start, end } = ordered(mode.anchor, mode.cursor)
  const text = selectedText(contentOf(state, mode), start, end)
  return appendLog({ ...left, clipboard: text }, { name: 'copy-selection', origin: 'key', key, detail: { text } })
}

/** Handles a key pressed in copy mode; every key is handled there, and none outside it. */
export function copyModeKey(state: TmuxState, key: KeyId): { state: TmuxState; handled: boolean } {
  const mode = state.copyMode
  if (!mode) return { state, handled: false }
  if (EXIT_KEYS.includes(key)) return { state: { ...state, copyMode: null }, handled: true }
  if (COPY_KEYS.includes(key)) return { state: copySelection(state, mode, key), handled: true }
  if (SELECT_KEYS.includes(key)) return { state: { ...state, copyMode: { ...mode, anchor: mode.cursor } }, handled: true }
  if (!Object.hasOwn(MOVES, key)) return { state, handled: true }
  const cursor = clampPosition(contentOf(state, mode), MOVES[key](mode.cursor))
  return { state: { ...state, copyMode: { ...mode, cursor } }, handled: true }
}

/** The selected span in reading order, for highlighting; null when nothing is selected. */
export function selectionRange(state: TmuxState): { start: Position; end: Position } | null {
  const mode = state.copyMode
  return mode?.anchor ? ordered(mode.anchor, mode.cursor) : null
}
