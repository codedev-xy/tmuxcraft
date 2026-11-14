import { describe, it, expect } from 'vitest'
import { allocId, defaultState, emptyState, nextIdAfter } from '../state'
import { getAllPanes } from '../layout-engine'
import { twoSessionState } from './fixtures'

describe('defaultState', () => {
  it('is one attached session with one window and one pane', () => {
    const state = defaultState()
    expect(state.isDetached).toBe(false)
    expect(state.sessions).toHaveLength(1)
    expect(state.sessions[0].id).toBe(state.activeSessionId)
    expect(state.sessions[0].windows).toHaveLength(1)
    expect(getAllPanes(state.sessions[0].windows[0].layoutTree)).toHaveLength(1)
  })

  it('leaves the counter above the IDs it used', () => {
    const state = defaultState()
    expect(state.nextId).toBe(nextIdAfter(state.sessions))
  })
})

describe('allocId', () => {
  it('hands out an ID for the kind and advances the counter', () => {
    const first = allocId({ ...emptyState(), nextId: 4 }, 'p')
    expect(first.id).toBe('p4')
    expect(first.state.nextId).toBe(5)
    expect(allocId(first.state, 'w').id).toBe('w5')
    expect(allocId(first.state, 's').id).toBe('s5')
  })

  it('does not change the state it was given', () => {
    const state = { ...emptyState(), nextId: 4 }
    allocId(state, 'p')
    expect(state.nextId).toBe(4)
  })
})

describe('nextIdAfter', () => {
  it('is 1 when nothing exists', () => {
    expect(nextIdAfter([])).toBe(1)
  })

  it('is one past the largest number used by any session, window or pane', () => {
    expect(nextIdAfter(twoSessionState().sessions)).toBe(5)
  })
})
