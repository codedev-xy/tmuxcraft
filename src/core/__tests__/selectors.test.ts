import { describe, it, expect } from 'vitest'
import {
  findSession, getActivePane, getActiveSession, getActiveWindow, locatePane, locateWindow, windowPanes,
} from '../selectors'
import { emptyState } from '../state'
import { twoSessionState } from './fixtures'

describe('active selectors', () => {
  it('finds the active session, window and pane', () => {
    const state = twoSessionState()
    expect(getActiveSession(state)?.id).toBe('s1')
    expect(getActiveWindow(state)?.id).toBe('w1')
    expect(getActivePane(state)?.id).toBe('p1')
  })

  it('returns null when there is no session', () => {
    const state = emptyState()
    expect(getActiveSession(state)).toBeNull()
    expect(getActiveWindow(state)).toBeNull()
    expect(getActivePane(state)).toBeNull()
  })
})

describe('lookups', () => {
  it('finds a session by ID', () => {
    expect(findSession(twoSessionState(), 's2')?.name).toBe('staging')
    expect(findSession(twoSessionState(), 's9')).toBeNull()
  })

  it('locates a window with its session and index', () => {
    const found = locateWindow(twoSessionState(), 'w2')
    expect(found?.session.id).toBe('s1')
    expect(found?.window.name).toBe('server')
    expect(found?.index).toBe(1)
    expect(locateWindow(twoSessionState(), 'w9')).toBeNull()
  })

  it('locates a pane with its session, window and indexes', () => {
    const found = locatePane(twoSessionState(), 'p2')
    expect(found?.session.id).toBe('s1')
    expect(found?.window.id).toBe('w1')
    expect(found?.index).toBe(0)
    expect(found?.paneIndex).toBe(1)
    expect(found?.pane.id).toBe('p2')
    expect(locatePane(twoSessionState(), 'p9')).toBeNull()
  })

  it('lists the panes of a window in layout order', () => {
    const editor = twoSessionState().sessions[0].windows[0]
    expect(windowPanes(editor).map(pane => pane.id)).toEqual(['p1', 'p2'])
  })
})
