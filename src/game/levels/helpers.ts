import type { TmuxState, Session, Window, LayoutNode } from '@/core/types'
import { createSession, createWindow, emptyState, nextIdAfter, paneNode, splitNode } from '@/core/state'

export { createPane, paneNode } from '@/core/state'

export function split(direction: 'horizontal' | 'vertical', child1: LayoutNode, child2: LayoutNode, ratio = 0.5): LayoutNode {
  return splitNode(direction, child1, child2, ratio)
}

export function makeWindow(id: string, name: string, layoutTree: LayoutNode, activePaneId: string): Window {
  return createWindow(id, name, layoutTree, activePaneId)
}

export function makeSession(id: string, name: string, windows: Window[], activeWindowIndex = 0): Session {
  return createSession(id, name, windows, activeWindowIndex)
}

export function makeState(sessions: Session[], activeSessionId: string, detached = false): TmuxState {
  return { ...emptyState(), sessions, activeSessionId, isDetached: detached, nextId: nextIdAfter(sessions) }
}

export function singlePaneState(sessionName = '0', windowName = 'bash'): TmuxState {
  const win = makeWindow('w1', windowName, paneNode('p1'), 'p1')
  const sess = makeSession('s1', sessionName, [win])
  return makeState([sess], 's1')
}

export function countPanesInState(state: TmuxState): number {
  let count = 0
  for (const session of state.sessions) {
    for (const window of session.windows) {
      count += countPanesInTree(window.layoutTree)
    }
  }
  return count
}

function countPanesInTree(node: LayoutNode): number {
  if (node.type === 'pane') return 1
  if (node.children) return countPanesInTree(node.children[0]) + countPanesInTree(node.children[1])
  return 0
}

export function getWindowNames(state: TmuxState): string[] {
  const session = state.sessions.find(s => s.id === state.activeSessionId)
  return session?.windows.map(w => w.name) || []
}
