import type { Pane, Session, TmuxState, Window } from './types'
import { getAllPanes } from './layout-engine'

export interface WindowLocation {
  readonly session: Session
  readonly window: Window
  /** Position of the window in its session, which is also its tmux window index. */
  readonly index: number
}

export interface PaneLocation extends WindowLocation {
  readonly pane: Pane
  /** Position of the pane in its window's layout order, which is also its tmux pane index. */
  readonly paneIndex: number
}

export function findSession(state: TmuxState, sessionId: string): Session | null {
  return state.sessions.find(session => session.id === sessionId) ?? null
}

/** The session the client is attached to, or would attach to next while detached. */
export function getActiveSession(state: TmuxState): Session | null {
  return findSession(state, state.activeSessionId)
}

export function currentWindow(session: Session): Window | null {
  return session.windows[session.activeWindowIndex] ?? null
}

export function getActiveWindow(state: TmuxState): Window | null {
  const session = getActiveSession(state)
  return session ? currentWindow(session) : null
}

/** Panes of a window in layout order (left to right, top to bottom). */
export function windowPanes(window: Window): Pane[] {
  return getAllPanes(window.layoutTree)
}

export function currentPane(window: Window): Pane | null {
  return windowPanes(window).find(pane => pane.id === window.activePaneId) ?? null
}

export function getActivePane(state: TmuxState): Pane | null {
  const window = getActiveWindow(state)
  return window ? currentPane(window) : null
}

export function locateWindow(state: TmuxState, windowId: string): WindowLocation | null {
  for (const session of state.sessions) {
    const index = session.windows.findIndex(window => window.id === windowId)
    if (index >= 0) return { session, window: session.windows[index], index }
  }
  return null
}

export function locatePane(state: TmuxState, paneId: string): PaneLocation | null {
  for (const session of state.sessions) {
    for (const [index, window] of session.windows.entries()) {
      const panes = windowPanes(window)
      const paneIndex = panes.findIndex(pane => pane.id === paneId)
      if (paneIndex >= 0) return { session, window, index, pane: panes[paneIndex], paneIndex }
    }
  }
  return null
}

/** A pane by ID, including the terminal outside tmux. */
export function findPane(state: TmuxState, paneId: string): Pane | null {
  if (paneId === state.outer.id) return state.outer
  return locatePane(state, paneId)?.pane ?? null
}

/** The pane a typed line runs in: the active pane, or the terminal outside tmux while detached. */
export function shellPaneId(state: TmuxState): string {
  const active = state.isDetached ? null : getActivePane(state)
  return active?.id ?? state.outer.id
}
