import type { LayoutNode, LogEntry, Pane, Session, TmuxState, Window } from './types'
import { findSession, locatePane, locateWindow } from './selectors'

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

export function updatePane(state: TmuxState, paneId: string, change: (pane: Pane) => Pane): TmuxState {
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

/** Removes a session. A client attached to it is detached, as tmux does by default. */
export function removeSession(state: TmuxState, sessionId: string): TmuxState {
  if (!findSession(state, sessionId)) return state
  const sessions = state.sessions.filter(session => session.id !== sessionId)
  if (state.activeSessionId !== sessionId) return { ...state, sessions }
  return {
    ...state,
    sessions,
    activeSessionId: sessions[0]?.id ?? '',
    isDetached: true,
    copyMode: null,
    prompt: null,
  }
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
