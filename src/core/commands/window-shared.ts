import type { Session, TmuxState, Window } from '../types'
import { allocId, createWindow, paneNode } from '../state'
import { locateWindow, windowPanes } from '../selectors'
import { updateSession } from '../update'
import type { CommandOutcome, RunContext } from './types'

/** A window holding one fresh pane, not yet placed in any session. */
export function buildWindow(state: TmuxState, name: string): { state: TmuxState; window: Window } {
  const windowId = allocId(state, 'w')
  const paneId = allocId(windowId.state, 'p')
  return { state: paneId.state, window: createWindow(windowId.id, name, paneNode(paneId.id), paneId.id) }
}

/** Makes the window at `index` the current window of a session; the client stays where it is. */
export function selectWindowAt(state: TmuxState, sessionId: string, index: number): TmuxState {
  return updateSession(state, sessionId, session => ({ ...session, activeWindowIndex: index }))
}

/** Makes a window its session's current window, wherever it now sits. */
export function showWindow(state: TmuxState, windowId: string): TmuxState {
  const found = locateWindow(state, windowId)
  return found ? selectWindowAt(state, found.session.id, found.index) : state
}

/** Runs the trailing words of `new-session` / `new-window` as a shell command in the new pane. */
export function runStartCommand(
  state: TmuxState,
  paneId: string,
  words: readonly string[],
  ctx: RunContext,
  detail: Readonly<Record<string, string>>,
): CommandOutcome {
  if (words.length === 0) return { state, detail }
  const result = ctx.shell(state, paneId, words.join(' '), ctx)
  return { state: result.state, output: result.output, errors: result.errors, detail }
}

/** A window line as `list-windows` prints it: `0: editor* (2 panes)`. */
export function formatWindowLine(session: Session, window: Window, index: number): string {
  const mark = index === session.activeWindowIndex ? '*' : ''
  return `${index}: ${window.name}${mark} (${windowPanes(window).length} panes)`
}
