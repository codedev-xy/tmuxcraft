import type { Direction, TmuxState } from './types'
import { executeLine } from './execute'
import { isOn } from './options'
import { getActiveWindow, windowPanes } from './selectors'
import type { Engine, ExecContext } from './commands/types'
import type { KeyResult } from './key-handler'

const MOUSE: ExecContext = { origin: 'mouse' }

const RESIZE_FLAGS: Readonly<Record<Direction, string>> = { up: 'U', down: 'D', left: 'L', right: 'R' }

function untouched(state: TmuxState, handled: boolean): KeyResult {
  return { state, ok: true, output: [], errors: [], handled }
}

/** True when tmux takes mouse events for `paneId`: mouse on, attached, nothing modal open, pane on screen. */
function takesMouse(state: TmuxState, paneId: string): boolean {
  if (!isOn(state, 'mouse') || state.isDetached || state.prompt || state.editing !== null) return false
  const window = getActiveWindow(state)
  return window !== null && windowPanes(window).some(pane => pane.id === paneId)
}

/** A click on a pane: selects it, as tmux does with `mouse on`. */
export function clickPane(state: TmuxState, paneId: string, engine: Engine): KeyResult {
  if (!takesMouse(state, paneId)) return untouched(state, false)
  if (getActiveWindow(state)?.activePaneId === paneId) return untouched(state, true)
  return { ...executeLine(state, `select-pane -t %${paneId}`, MOUSE, engine), handled: true }
}

/** A drag on a border of `paneId` by `cells` towards `direction`: resizes without changing the active pane. */
export function dragBorder(state: TmuxState, paneId: string, direction: Direction, cells: number, engine: Engine): KeyResult {
  if (!takesMouse(state, paneId)) return untouched(state, false)
  const amount = Math.round(cells)
  if (amount <= 0) return untouched(state, true)
  const line = `resize-pane -${RESIZE_FLAGS[direction]} -t %${paneId} ${amount}`
  return { ...executeLine(state, line, MOUSE, engine), handled: true }
}
