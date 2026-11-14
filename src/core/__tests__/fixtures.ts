import type { TmuxState } from '../types'
import { createSession, createWindow, emptyState, paneNode, splitNode } from '../state'

/**
 * s1 "dev" (active): w1 "editor" [p1 | p2, p1 active], w2 "server" [p3]
 * s2 "staging":      w3 "logs" [p4]
 */
export function twoSessionState(): TmuxState {
  const editor = createWindow('w1', 'editor', splitNode('vertical', paneNode('p1'), paneNode('p2')), 'p1')
  const server = createWindow('w2', 'server', paneNode('p3'), 'p3')
  const logs = createWindow('w3', 'logs', paneNode('p4'), 'p4')
  const sessions = [createSession('s1', 'dev', [editor, server]), createSession('s2', 'staging', [logs])]
  return { ...emptyState(), sessions, activeSessionId: 's1', isDetached: false, nextId: 5 }
}
