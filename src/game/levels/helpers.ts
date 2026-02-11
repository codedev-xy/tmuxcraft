import type { TmuxState, Session, Window, Pane, LayoutNode } from '@/core/types'

export function createPane(id: string, content: string[] = []): Pane {
  return { id, content, cursorPosition: { row: 0, col: 0 }, isZoomed: false, cwd: '~' }
}

export function paneNode(id: string, content: string[] = []): LayoutNode {
  return { type: 'pane', pane: createPane(id, content) }
}

export function split(direction: 'horizontal' | 'vertical', child1: LayoutNode, child2: LayoutNode, ratio = 0.5): LayoutNode {
  return { type: 'split', direction, ratio, children: [child1, child2] }
}

export function makeWindow(id: string, name: string, layoutTree: LayoutNode, activePaneId: string): Window {
  return { id, name, layoutTree, activePaneId, synchronizePanes: false }
}

export function makeSession(id: string, name: string, windows: Window[], activeWindowIndex = 0): Session {
  return { id, name, windows, activeWindowIndex }
}

export function makeState(sessions: Session[], activeSessionId: string, detached = false): TmuxState {
  return { sessions, activeSessionId, clipboard: '', isDetached: detached }
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
