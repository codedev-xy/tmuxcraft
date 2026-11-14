import { describe, it, expect } from 'vitest'
import {
  appendLog, appendPaneLines, detachClient, insertWindow, mapPanes, removePane, removeSession, removeWindow, updatePane,
  updateSession, updateWindow,
} from '../update'
import { locatePane, locateWindow, findSession, windowPanes } from '../selectors'
import { createWindow, paneNode, splitNode } from '../state'
import { twoSessionState } from './fixtures'

describe('updateSession / updateWindow / updatePane', () => {
  it('changes only the session it was asked to change', () => {
    const state = twoSessionState()
    const next = updateSession(state, 's2', session => ({ ...session, name: 'prod' }))
    expect(findSession(next, 's2')?.name).toBe('prod')
    expect(next.sessions[0]).toBe(state.sessions[0])
    expect(state.sessions[1].name).toBe('staging')
  })

  it('changes a window in whichever session holds it', () => {
    const state = twoSessionState()
    const next = updateWindow(state, 'w3', window => ({ ...window, name: 'tail' }))
    expect(locateWindow(next, 'w3')?.window.name).toBe('tail')
    expect(next.sessions[0]).toBe(state.sessions[0])
    expect(state.sessions[1].windows[0].name).toBe('logs')
  })

  it('changes a pane inside a split', () => {
    const state = twoSessionState()
    const next = updatePane(state, 'p2', pane => ({ ...pane, input: 'ls' }))
    expect(locatePane(next, 'p2')?.pane.input).toBe('ls')
    expect(locatePane(next, 'p1')?.pane).toBe(locatePane(state, 'p1')?.pane)
    expect(locatePane(state, 'p2')?.pane.input).toBe('')
  })

  it('returns the same state when the ID does not exist', () => {
    const state = twoSessionState()
    expect(updateSession(state, 's9', session => ({ ...session, name: 'x' }))).toBe(state)
    expect(updateWindow(state, 'w9', window => ({ ...window, name: 'x' }))).toBe(state)
    expect(updatePane(state, 'p9', pane => ({ ...pane, input: 'x' }))).toBe(state)
  })
})

describe('mapPanes', () => {
  it('applies the change to every pane and keeps the tree shape', () => {
    const editor = twoSessionState().sessions[0].windows[0]
    const tree = mapPanes(editor.layoutTree, pane => ({ ...pane, cwd: '/tmp' }))
    expect(tree.type).toBe('split')
    expect(tree.direction).toBe('vertical')
    expect(windowPanes({ ...editor, layoutTree: tree }).map(pane => pane.cwd)).toEqual(['/tmp', '/tmp'])
    expect(windowPanes(editor).map(pane => pane.cwd)).toEqual(['~', '~'])
  })
})

describe('appendPaneLines', () => {
  it('adds lines to the end of the pane scrollback', () => {
    const once = appendPaneLines(twoSessionState(), 'p3', ['$ npm run dev'])
    const twice = appendPaneLines(once, 'p3', ['ready', 'listening'])
    expect(locatePane(twice, 'p3')?.pane.content).toEqual(['$ npm run dev', 'ready', 'listening'])
    expect(locatePane(once, 'p3')?.pane.content).toEqual(['$ npm run dev'])
  })
})

describe('appendLog', () => {
  it('numbers entries from 1 in the order they were added', () => {
    const once = appendLog(twoSessionState(), { name: 'split-window', origin: 'key', key: '%' })
    const twice = appendLog(once, { name: 'detach-client', origin: 'typed' })
    expect(twice.log).toEqual([
      { seq: 1, name: 'split-window', origin: 'key', key: '%' },
      { seq: 2, name: 'detach-client', origin: 'typed' },
    ])
    expect(once.log).toHaveLength(1)
  })
})

describe('the terminal outside tmux', () => {
  it('is updated like any other pane', () => {
    const state = twoSessionState()
    const next = appendPaneLines(state, state.outer.id, ['$ tmux ls'])
    expect(next.outer.content).toEqual(['$ tmux ls'])
    expect(state.outer.content).toEqual([])
  })
})

describe('detachClient', () => {
  it('detaches, prints the notice outside and closes anything modal', () => {
    const state = {
      ...twoSessionState(),
      prefixPending: true,
      copyMode: { paneId: 'p1', cursor: { row: 0, col: 0 }, anchor: null },
      prompt: { label: ':', initial: '', template: '%%' },
    }
    const next = detachClient(state, '[detached (from session dev)]')
    expect(next.isDetached).toBe(true)
    expect(next.outer.content).toEqual(['[detached (from session dev)]'])
    expect(next.prefixPending).toBe(false)
    expect(next.copyMode).toBeNull()
    expect(next.prompt).toBeNull()
    expect(next.activeSessionId).toBe('s1')
  })
})

describe('removeWindow', () => {
  it('removes an inactive window and keeps the active one selected', () => {
    const next = removeWindow(twoSessionState(), 'w2')
    expect(findSession(next, 's1')?.windows.map(window => window.id)).toEqual(['w1'])
    expect(findSession(next, 's1')?.activeWindowIndex).toBe(0)
  })

  it('keeps the same window active when an earlier window is removed', () => {
    const state = updateSession(twoSessionState(), 's1', session => ({ ...session, activeWindowIndex: 1 }))
    const next = removeWindow(state, 'w1')
    const session = findSession(next, 's1')
    expect(session?.windows[session.activeWindowIndex].id).toBe('w2')
  })

  it('selects a neighbour when the active window is removed', () => {
    const next = removeWindow(twoSessionState(), 'w1')
    const session = findSession(next, 's1')
    expect(session?.windows[session.activeWindowIndex].id).toBe('w2')
  })

  it('removes the session with its last window', () => {
    const next = removeWindow(twoSessionState(), 'w3')
    expect(next.sessions.map(session => session.id)).toEqual(['s1'])
    expect(next.activeSessionId).toBe('s1')
    expect(next.isDetached).toBe(false)
  })

  it('returns the same state when the window does not exist', () => {
    const state = twoSessionState()
    expect(removeWindow(state, 'w9')).toBe(state)
  })
})

describe('removeSession', () => {
  it('leaves the client alone when another session is removed', () => {
    const next = removeSession(twoSessionState(), 's2')
    expect(next.sessions.map(session => session.id)).toEqual(['s1'])
    expect(next.activeSessionId).toBe('s1')
    expect(next.isDetached).toBe(false)
  })

  it('detaches the client when its own session is removed, leaving a session for the next attach', () => {
    const next = removeSession(twoSessionState(), 's1')
    expect(next.activeSessionId).toBe('s2')
    expect(next.isDetached).toBe(true)
    expect(next.outer.content).toEqual(['[exited]'])
  })

  it('prints nothing when a session is removed from outside tmux', () => {
    const next = removeSession({ ...twoSessionState(), isDetached: true }, 's1')
    expect(next.activeSessionId).toBe('s2')
    expect(next.outer.content).toEqual([])
  })

  it('detaches when the last session is removed', () => {
    const next = removeSession(removeSession(twoSessionState(), 's1'), 's2')
    expect(next.sessions).toEqual([])
    expect(next.activeSessionId).toBe('')
    expect(next.isDetached).toBe(true)
  })

  it('closes copy mode and the prompt when the attached session is removed', () => {
    const state = {
      ...twoSessionState(),
      copyMode: { paneId: 'p1', cursor: { row: 0, col: 0 }, anchor: null },
      prompt: { label: ':', initial: '', template: '%%' },
    }
    const next = removeSession(state, 's1')
    expect(next.copyMode).toBeNull()
    expect(next.prompt).toBeNull()
  })
})

describe('insertWindow', () => {
  const extra = () => createWindow('w7', 'extra', paneNode('p7'), 'p7')
  const ids = (state: ReturnType<typeof twoSessionState>, sessionId: string) =>
    findSession(state, sessionId)?.windows.map(window => window.id)

  it('appends when no index is given', () => {
    const next = insertWindow(twoSessionState(), 's1', extra(), null)
    expect(ids(next, 's1')).toEqual(['w1', 'w2', 'w7'])
    expect(findSession(next, 's1')?.activeWindowIndex).toBe(0)
  })

  it('appends when the index is past the end', () => {
    expect(ids(insertWindow(twoSessionState(), 's1', extra(), 9), 's1')).toEqual(['w1', 'w2', 'w7'])
  })

  it('inserts at the index and keeps the current window current', () => {
    const state = updateSession(twoSessionState(), 's1', session => ({ ...session, activeWindowIndex: 1 }))
    const next = insertWindow(state, 's1', extra(), 0)
    const session = findSession(next, 's1')
    expect(ids(next, 's1')).toEqual(['w7', 'w1', 'w2'])
    expect(session?.windows[session.activeWindowIndex].id).toBe('w2')
  })

  it('does not move the current window when inserting after it', () => {
    const next = insertWindow(twoSessionState(), 's1', extra(), 1)
    expect(ids(next, 's1')).toEqual(['w1', 'w7', 'w2'])
    expect(findSession(next, 's1')?.activeWindowIndex).toBe(0)
  })

  it('inserts into a session other than the attached one', () => {
    const state = twoSessionState()
    const next = insertWindow(state, 's2', extra(), null)
    expect(ids(next, 's2')).toEqual(['w3', 'w7'])
    expect(next.sessions[0]).toBe(state.sessions[0])
    expect(ids(state, 's2')).toEqual(['w3'])
  })

  it('returns the same state when the session does not exist', () => {
    const state = twoSessionState()
    expect(insertWindow(state, 's9', extra(), null)).toBe(state)
  })
})

describe('removePane', () => {
  /** w1 becomes [p1 | p2 / p5], listed in that order. */
  function threePaneState() {
    const tree = splitNode('vertical', paneNode('p1'), splitNode('horizontal', paneNode('p2'), paneNode('p5')))
    return updateWindow(twoSessionState(), 'w1', window => ({ ...window, layoutTree: tree }))
  }
  const paneIds = (state: ReturnType<typeof twoSessionState>, windowId: string) => {
    const found = locateWindow(state, windowId)
    return found ? windowPanes(found.window).map(pane => pane.id) : null
  }

  it('removes the pane and gives its space to its sibling', () => {
    const next = removePane(twoSessionState(), 'p2')
    const editor = locateWindow(next, 'w1')?.window
    expect(editor?.layoutTree.type).toBe('pane')
    expect(paneIds(next, 'w1')).toEqual(['p1'])
    expect(editor?.activePaneId).toBe('p1')
  })

  it('keeps the active pane when another pane is removed', () => {
    const state = updateWindow(threePaneState(), 'w1', window => ({ ...window, activePaneId: 'p5' }))
    expect(locateWindow(removePane(state, 'p1'), 'w1')?.window.activePaneId).toBe('p5')
  })

  it('selects the pane that takes the removed active pane\'s place', () => {
    const next = removePane(threePaneState(), 'p1')
    expect(paneIds(next, 'w1')).toEqual(['p2', 'p5'])
    expect(locateWindow(next, 'w1')?.window.activePaneId).toBe('p2')
  })

  it('selects the last pane when the removed active pane was last', () => {
    const state = updateWindow(threePaneState(), 'w1', window => ({ ...window, activePaneId: 'p5' }))
    expect(locateWindow(removePane(state, 'p5'), 'w1')?.window.activePaneId).toBe('p2')
  })

  it('ends the zoom', () => {
    const state = updateWindow(threePaneState(), 'w1', window => ({ ...window, zoomed: true }))
    expect(locateWindow(removePane(state, 'p5'), 'w1')?.window.zoomed).toBe(false)
  })

  it('removes the window with its last pane', () => {
    const next = removePane(twoSessionState(), 'p3')
    expect(findSession(next, 's1')?.windows.map(window => window.id)).toEqual(['w1'])
  })

  it('removes the session with its last pane', () => {
    const next = removePane(twoSessionState(), 'p4')
    expect(next.sessions.map(session => session.id)).toEqual(['s1'])
  })

  it('does not change the state it was given', () => {
    const state = twoSessionState()
    removePane(state, 'p2')
    expect(paneIds(state, 'w1')).toEqual(['p1', 'p2'])
  })

  it('returns the same state when the pane does not exist', () => {
    const state = twoSessionState()
    expect(removePane(state, 'p9')).toBe(state)
    expect(removePane(state, state.outer.id)).toBe(state)
  })
})
