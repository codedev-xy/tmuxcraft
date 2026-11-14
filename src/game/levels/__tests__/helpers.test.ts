import { describe, it, expect } from 'vitest'
import { makeSession, makeState, makeWindow, paneNode, singlePaneState, split } from '../helpers'

describe('makeState', () => {
  it('starts the ID counter above every ID the level uses', () => {
    const window = makeWindow('w1', 'bash', split('vertical', paneNode('p1'), paneNode('p3')), 'p1')
    const state = makeState([makeSession('s1', '0', [window])], 's1')
    expect(state.nextId).toBe(4)
  })

  it('starts at 1 for a level with no sessions', () => {
    expect(makeState([], '', true).nextId).toBe(1)
  })
})

describe('singlePaneState', () => {
  it('builds one attached session with one pane', () => {
    const state = singlePaneState('main', 'shell')
    expect(state.isDetached).toBe(false)
    expect(state.sessions[0].name).toBe('main')
    expect(state.sessions[0].windows[0].name).toBe('shell')
    expect(state.nextId).toBe(2)
  })
})
