import { describe, it, expect } from 'vitest'
import { resolvePane, resolveSession, resolveWindow, resolveWindowSlot } from '../target'
import type { Result } from '../errors'
import { emptyState } from '../state'
import { updateSession } from '../update'
import { twoSessionState } from './fixtures'

function valueOf<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(`expected a target, got ${result.error.code}`)
  return result.value
}

function errorOf<T>(result: Result<T>) {
  if (result.ok) throw new Error('expected a target error')
  return result.error
}

const state = twoSessionState()

describe('resolveSession', () => {
  it('defaults to the current session', () => {
    expect(valueOf(resolveSession(state)).id).toBe('s1')
  })

  it('finds a session by exact name, then by unique prefix', () => {
    expect(valueOf(resolveSession(state, 'staging')).id).toBe('s2')
    expect(valueOf(resolveSession(state, 'stag')).id).toBe('s2')
    expect(valueOf(resolveSession(state, 'd')).id).toBe('s1')
  })

  it('prefers an exact name over a longer name it prefixes', () => {
    const renamed = updateSession(state, 's2', session => ({ ...session, name: 'dev2' }))
    expect(valueOf(resolveSession(renamed, 'dev')).id).toBe('s1')
    expect(errorOf(resolveSession(renamed, 'de')).code).toBe('target.sessionNotFound')
  })

  it('accepts a trailing colon and a window part', () => {
    expect(valueOf(resolveSession(state, 'staging:')).id).toBe('s2')
    expect(valueOf(resolveSession(state, 'staging:0')).id).toBe('s2')
  })

  it('finds a session by ID', () => {
    expect(valueOf(resolveSession(state, '$s2')).id).toBe('s2')
  })

  it('reports an unknown session', () => {
    expect(errorOf(resolveSession(state, 'prod'))).toEqual({ code: 'target.sessionNotFound', params: { target: 'prod' } })
  })

  it('reports that there are no sessions', () => {
    expect(errorOf(resolveSession(emptyState())).code).toBe('session.none')
    expect(errorOf(resolveSession(emptyState(), 'dev')).code).toBe('session.none')
  })
})

describe('resolveWindow', () => {
  it('defaults to the current window', () => {
    expect(valueOf(resolveWindow(state)).window.id).toBe('w1')
  })

  it('finds a window in the current session by index, name or prefix', () => {
    expect(valueOf(resolveWindow(state, ':1')).window.id).toBe('w2')
    expect(valueOf(resolveWindow(state, '1')).window.id).toBe('w2')
    expect(valueOf(resolveWindow(state, 'server')).window.id).toBe('w2')
    expect(valueOf(resolveWindow(state, 'serv')).window.id).toBe('w2')
  })

  it('finds a window in another session', () => {
    const found = valueOf(resolveWindow(state, 'staging:logs'))
    expect(found.session.id).toBe('s2')
    expect(found.window.id).toBe('w3')
    expect(found.index).toBe(0)
    expect(valueOf(resolveWindow(state, 'staging:0')).window.id).toBe('w3')
  })

  it('reads a bare name that is not a window as a session', () => {
    expect(valueOf(resolveWindow(state, 'staging')).window.id).toBe('w3')
  })

  it('reads a session with an empty window part as its current window', () => {
    const onServer = updateSession(state, 's1', session => ({ ...session, activeWindowIndex: 1 }))
    expect(valueOf(resolveWindow(onServer, 'dev:')).window.id).toBe('w2')
  })

  it('supports relative and edge tokens', () => {
    expect(valueOf(resolveWindow(state, ':+')).window.id).toBe('w2')
    expect(valueOf(resolveWindow(state, ':-')).window.id).toBe('w2')
    expect(valueOf(resolveWindow(state, ':^')).window.id).toBe('w1')
    expect(valueOf(resolveWindow(state, ':$')).window.id).toBe('w2')
  })

  it('finds a window by ID', () => {
    expect(valueOf(resolveWindow(state, '@w3')).session.id).toBe('s2')
  })

  it('reports an unknown window or session', () => {
    expect(errorOf(resolveWindow(state, ':7'))).toEqual({ code: 'target.windowNotFound', params: { target: ':7' } })
    expect(errorOf(resolveWindow(state, 'dev:nope')).code).toBe('target.windowNotFound')
    expect(errorOf(resolveWindow(state, 'prod:0')).code).toBe('target.sessionNotFound')
    expect(errorOf(resolveWindow(state, 'nope')).code).toBe('target.windowNotFound')
  })
})

describe('resolvePane', () => {
  it('defaults to the active pane', () => {
    expect(valueOf(resolvePane(state)).pane.id).toBe('p1')
  })

  it('finds a pane by index in the current window', () => {
    expect(valueOf(resolvePane(state, '1')).pane.id).toBe('p2')
    expect(valueOf(resolvePane(state, ':.1')).pane.id).toBe('p2')
    expect(valueOf(resolvePane(state, '.1')).pane.id).toBe('p2')
  })

  it('cycles with + and -', () => {
    expect(valueOf(resolvePane(state, ':.+')).pane.id).toBe('p2')
    expect(valueOf(resolvePane(state, ':.-')).pane.id).toBe('p2')
    expect(valueOf(resolvePane(state, '+')).pane.id).toBe('p2')
  })

  it('reads a window target as that window\'s active pane', () => {
    expect(valueOf(resolvePane(state, 'dev:server')).pane.id).toBe('p3')
    expect(valueOf(resolvePane(state, ':1')).pane.id).toBe('p3')
    expect(valueOf(resolvePane(state, 'server')).pane.id).toBe('p3')
    expect(valueOf(resolvePane(state, 'staging')).pane.id).toBe('p4')
  })

  it('reads a full session:window.pane target', () => {
    const found = valueOf(resolvePane(state, 'dev:editor.1'))
    expect(found.session.id).toBe('s1')
    expect(found.window.id).toBe('w1')
    expect(found.pane.id).toBe('p2')
    expect(found.paneIndex).toBe(1)
    expect(valueOf(resolvePane(state, 'editor.1')).pane.id).toBe('p2')
  })

  it('finds a pane by ID', () => {
    expect(valueOf(resolvePane(state, '%p4')).window.id).toBe('w3')
  })

  it('reports an unknown pane', () => {
    expect(errorOf(resolvePane(state, ':.5'))).toEqual({ code: 'target.paneNotFound', params: { target: ':.5' } })
    expect(errorOf(resolvePane(state, 'dev:server.3')).code).toBe('target.paneNotFound')
    expect(errorOf(resolvePane(state, '%p9')).code).toBe('target.paneNotFound')
    expect(errorOf(resolvePane(state, 'dev:nope.0')).code).toBe('target.windowNotFound')
  })
})

describe('resolveWindowSlot', () => {
  it('defaults to the next free index in the current session', () => {
    const slot = valueOf(resolveWindowSlot(state))
    expect(slot.session.id).toBe('s1')
    expect(slot.index).toBeNull()
  })

  it('reads a session name as the next free index in that session', () => {
    expect(valueOf(resolveWindowSlot(state, 'staging'))).toMatchObject({ session: { id: 's2' }, index: null })
    expect(valueOf(resolveWindowSlot(state, 'staging:'))).toMatchObject({ session: { id: 's2' }, index: null })
  })

  it('reads an explicit index', () => {
    expect(valueOf(resolveWindowSlot(state, 'staging:3'))).toMatchObject({ session: { id: 's2' }, index: 3 })
    expect(valueOf(resolveWindowSlot(state, ':2'))).toMatchObject({ session: { id: 's1' }, index: 2 })
    expect(valueOf(resolveWindowSlot(state, '2'))).toMatchObject({ session: { id: 's1' }, index: 2 })
  })

  it('reports an unknown session or a non-numeric index', () => {
    expect(errorOf(resolveWindowSlot(state, 'prod')).code).toBe('target.sessionNotFound')
    expect(errorOf(resolveWindowSlot(state, 'dev:abc')).code).toBe('target.windowNotFound')
  })
})
