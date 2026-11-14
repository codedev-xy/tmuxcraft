import type { PaneLayout, Rect, Window } from '../types'
import { fail, ok } from '../errors'
import type { Result } from '../errors'
import { calculateLayout } from '../layout-engine'

/** The window size pane sizes are measured against; the simulator has no real terminal size. */
export const NOMINAL_WINDOW: Rect = { x: 0, y: 0, width: 80, height: 24 }

const DIGITS = /^\d+$/

/** Where a pane sits in its window on the nominal 80x24 grid. */
export function paneRect(window: Window, paneId: string): PaneLayout {
  const found = calculateLayout(window.layoutTree, NOMINAL_WINDOW).find(layout => layout.paneId === paneId)
  return found ?? { paneId, ...NOMINAL_WINDOW }
}

/** A non-negative whole number argument. */
export function parseCount(text: string): Result<number> {
  return DIGITS.test(text) ? ok(Number(text)) : fail('parse.badNumber', { value: text })
}
