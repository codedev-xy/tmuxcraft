import type { LayoutNode, LogEntry, Pane, Session, TmuxState, Window } from './types'
import { findSession, locatePane, locateWindow, windowPanes } from './selectors'
import { closePane } from './layout-engine'

/** Applies `change` to every pane of a layout tree, keeping its shape. */
export function mapPanes(node: LayoutNode, change: (pane: Pane) => Pane): LayoutNode {
  if (node.pane) return { ...node, pane: change(node.pane) }
  if (!node.children) return node
  return { ...node, children: [mapPanes(node.children[0], change), mapPanes(node.children[1], change)] }
}

export function updateSession(state: TmuxState, sessionId: string, change: (session: Session) => Session): TmuxState {
  if (!findSession(state, sessionId)) return state
  return { ...state, sessions: state.sessions.map(session => (session.id === sessionId ? change(session) : session)) }
}

export function updateWindow(state: TmuxState, windowId: string, change: (window: Window) => Window): TmuxState {
  const found = locateWindow(state, windowId)
  if (!found) return state
  return updateSession(state, found.session.id, session => ({
    ...session,
    windows: session.windows.map(window => (window.id === windowId ? change(window) : window)),
  }))
}

/** Changes a pane wherever it is, including the terminal outside tmux. */
export function updatePane(state: TmuxState, paneId: string, change: (pane: Pane) => Pane): TmuxState {
  if (paneId === state.outer.id) return { ...state, outer: change(state.outer) }
  const found = locatePane(state, paneId)
  if (!found) return state
  return updateWindow(state, found.window.id, window => ({
    ...window,
    layoutTree: mapPanes(window.layoutTree, pane => (pane.id === paneId ? change(pane) : pane)),
  }))
}

export function appendPaneLines(state: TmuxState, paneId: string, lines: readonly string[]): TmuxState {
  return updatePane(state, paneId, pane => ({ ...pane, content: [...pane.content, ...lines] }))
}

export function appendLog(state: TmuxState, entry: Omit<LogEntry, 'seq'>): TmuxState {
  return { ...state, log: [...state.log, { ...entry, seq: state.log.length + 1 }] }
}

/** Takes the client out of tmux, printing `notice` in the terminal outside as tmux does. */
export function detachClient(state: TmuxState, notice: string): TmuxState {
  return {
    ...state,
    isDetached: true,
    prefixPending: false,
    copyMode: null,
    prompt: null,
    outer: { ...state.outer, content: [...state.outer.content, notice] },
  }
}

/** Removes a session. A client attached to it drops back to the terminal outside, as tmux does by default. */
export function removeSession(state: TmuxState, sessionId: string): TmuxState {
  if (!findSession(state, sessionId)) return state
  const sessions = state.sessions.filter(session => session.id !== sessionId)
  if (state.activeSessionId !== sessionId) return { ...state, sessions }
  const next = { ...state, sessions, activeSessionId: sessions[0]?.id ?? '' }
  return state.isDetached ? next : detachClient(next, '[exited]')
}

/** Removes a window and renumbers the rest; removing a session's last window removes the session. */
export function removeWindow(state: TmuxState, windowId: string): TmuxState {
  const found = locateWindow(state, windowId)
  if (!found) return state
  const { session, index } = found
  if (session.windows.length === 1) return removeSession(state, session.id)
  const windows = session.windows.filter(window => window.id !== windowId)
  const active = session.activeWindowIndex
  const activeWindowIndex = index < active ? active - 1 : Math.min(active, windows.length - 1)
  return updateSession(state, session.id, current => ({ ...current, windows, activeWindowIndex }))
}

/**
 * Puts a window into a session at `index`, or at the end when `index` is null or past the end.
 * The session's current window stays current.
 */
export function insertWindow(state: TmuxState, sessionId: string, window: Window, index: number | null): TmuxState {
  return updateSession(state, sessionId, session => {
    const at = index === null ? session.windows.length : Math.min(index, session.windows.length)
    const windows = [...session.windows.slice(0, at), window, ...session.windows.slice(at)]
    const active = session.activeWindowIndex
    return { ...session, windows, activeWindowIndex: at <= active ? active + 1 : active }
  })
}

/**
 * Removes a pane, giving its space to its sibling and ending any zoom; removing a window's last pane removes the window.
 * When the active pane goes, the pane that takes its place in the pane order becomes active.
 */
export function removePane(state: TmuxState, paneId: string): TmuxState {
  const found = locatePane(state, paneId)
  if (!found) return state
  const layoutTree = closePane(found.window.layoutTree, paneId)
  if (!layoutTree) return removeWindow(state, found.window.id)
  return updateWindow(state, found.window.id, window => {
    const remaining = windowPanes({ ...window, layoutTree })
    const position = windowPanes(window).findIndex(pane => pane.id === paneId)
    const activePaneId = window.activePaneId === paneId ? remaining[Math.min(position, remaining.length - 1)].id : window.activePaneId
    return { ...window, layoutTree, activePaneId, zoomed: false }
  })
}
