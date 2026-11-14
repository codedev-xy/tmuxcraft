import { describe, it, expect } from 'vitest'
import {
  appendLog, appendPaneLines, mapPanes, removeSession, removeWindow, updatePane, updateSession, updateWindow,
} from '../update'
import { locatePane, locateWindow, findSession, windowPanes } from '../selectors'
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
