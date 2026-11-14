import type { KeyTables, LayoutNode, Pane, Session, TmuxState, Window } from './types'
import { DEFAULT_PREFIX_BINDINGS } from './keymap'

export const DEFAULT_SESSION_NAME = '0'
export const DEFAULT_WINDOW_NAME = 'bash'
export const HOME = '~'
/** ID of the pane that stands for the terminal outside tmux. */
export const OUTER_PANE_ID = 'outer'

export function createPane(id: string, content: readonly string[] = []): Pane {
  return { id, content: [...content], input: '', cwd: HOME, cursorPosition: { row: 0, col: 0 }, isZoomed: false }
}

export function paneNode(id: string, content: readonly string[] = []): LayoutNode {
  return { type: 'pane', pane: createPane(id, content) }
}

export function splitNode(direction: 'horizontal' | 'vertical', first: LayoutNode, second: LayoutNode, ratio = 0.5): LayoutNode {
  return { type: 'split', direction, ratio, children: [first, second] }
}

export function createWindow(id: string, name: string, layoutTree: LayoutNode, activePaneId: string): Window {
  return { id, name, layoutTree, activePaneId, synchronizePanes: false, zoomed: false, layoutIndex: -1 }
}

export function createSession(id: string, name: string, windows: Window[], activeWindowIndex = 0): Session {
  return { id, name, windows, activeWindowIndex }
}

export function defaultKeyTables(): KeyTables {
  return { prefix: DEFAULT_PREFIX_BINDINGS, root: {} }
}

/** A server with no sessions; spread over it to build any other state. */
export function emptyState(): TmuxState {
  return {
    sessions: [],
    activeSessionId: '',
    clipboard: '',
    isDetached: true,
    options: {},
    keyTables: defaultKeyTables(),
    copyMode: null,
    prompt: null,
    files: {},
    log: [],
    nextId: 0,
    prefixPending: false,
    outer: createPane(OUTER_PANE_ID),
    editing: null,
    setOptions: {},
    sourcedFiles: [],
  }
}

/** What a bare `tmux` gives you: one attached session with one window and one pane. */
export function defaultState(): TmuxState {
  const window = createWindow('w1', DEFAULT_WINDOW_NAME, paneNode('p1'), 'p1')
  const session = createSession('s1', DEFAULT_SESSION_NAME, [window])
  return { ...emptyState(), sessions: [session], activeSessionId: session.id, isDetached: false, nextId: 2 }
}

export type IdKind = 'p' | 'w' | 's'

/** Takes the next generated ID (`p7`, `w7`, `s7`); all kinds share one counter and no number is ever reused. */
export function allocId(state: TmuxState, kind: IdKind): { state: TmuxState; id: string } {
  return { state: { ...state, nextId: state.nextId + 1 }, id: `${kind}${state.nextId}` }
}

function paneIds(node: LayoutNode): string[] {
  if (node.pane) return [node.pane.id]
  return node.children ? node.children.flatMap(paneIds) : []
}

function trailingNumber(id: string): number {
  const digits = /\d+$/.exec(id)
  return digits ? Number(digits[0]) : 0
}

/** The counter value a hand-built state needs so that generated IDs cannot collide with the IDs it uses. */
export function nextIdAfter(sessions: readonly Session[]): number {
  const ids = sessions.flatMap(session => [
    session.id,
    ...session.windows.flatMap(window => [window.id, ...paneIds(window.layoutTree)]),
  ])
  return Math.max(0, ...ids.map(trailingNumber)) + 1
}
