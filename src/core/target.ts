import type { Session, TmuxState } from './types'
import { fail, ok } from './errors'
import type { Result } from './errors'
import { findSession, getActiveSession, locatePane, locateWindow, windowPanes } from './selectors'
import type { PaneLocation, WindowLocation } from './selectors'

/** Where a new or moved window should go; a null index means the next free one. */
export interface WindowSlot {
  readonly session: Session
  readonly index: number | null
}

interface TargetParts {
  /** null when the target has no `:`; an empty string means the current session. */
  readonly session: string | null
  readonly window: string
  /** null when the target has no `.`. */
  readonly pane: string | null
}

const DIGITS = /^\d+$/

/** Splits `session:window.pane`; without a colon the text before the first `.` is the window. */
function splitTarget(target: string): TargetParts {
  const colon = target.indexOf(':')
  const rest = colon < 0 ? target : target.slice(colon + 1)
  const dot = rest.indexOf('.')
  return {
    session: colon < 0 ? null : target.slice(0, colon),
    window: dot < 0 ? rest : rest.slice(0, dot),
    pane: dot < 0 ? null : rest.slice(dot + 1),
  }
}

/** An exact name wins; otherwise a prefix that matches exactly one item. */
function byName<T extends { readonly name: string }>(items: readonly T[], name: string): T | null {
  const exact = items.find(item => item.name === name)
  if (exact) return exact
  const prefixed = items.filter(item => item.name.startsWith(name))
  return prefixed.length === 1 ? prefixed[0] : null
}

function sessionNamed(state: TmuxState, name: string, target: string): Result<Session> {
  const session = name === '' ? getActiveSession(state) : byName(state.sessions, name)
  return session ? ok(session) : fail('target.sessionNotFound', { target })
}

/** Position of the item `token` names in a list of `count`: an index, or `+` / `-` cycling from `active`. */
function relativeIndex(token: string, active: number, count: number): number | null {
  if (token === '+') return (active + 1) % count
  if (token === '-') return (active - 1 + count) % count
  if (DIGITS.test(token) && Number(token) < count) return Number(token)
  return null
}

function windowIndexIn(session: Session, token: string): number | null {
  const count = session.windows.length
  if (token === '') return session.activeWindowIndex
  if (token === '^') return 0
  if (token === '$') return count - 1
  const index = relativeIndex(token, session.activeWindowIndex, count)
  if (index !== null || DIGITS.test(token)) return index
  const named = byName(session.windows, token)
  return named ? session.windows.indexOf(named) : null
}

function windowIn(session: Session, token: string, target: string): Result<WindowLocation> {
  const index = windowIndexIn(session, token)
  const window = index === null ? undefined : session.windows[index]
  if (index === null || !window) return fail('target.windowNotFound', { target })
  return ok({ session, window, index })
}

function paneIn(location: WindowLocation, token: string | null, target: string): Result<PaneLocation> {
  const panes = windowPanes(location.window)
  const active = panes.findIndex(pane => pane.id === location.window.activePaneId)
  const paneIndex = token === null || token === '' ? active : relativeIndex(token, active, panes.length)
  const pane = paneIndex === null ? undefined : panes[paneIndex]
  if (paneIndex === null || !pane) return fail('target.paneNotFound', { target })
  return ok({ ...location, pane, paneIndex })
}

/** Resolves a `-t` session target; with no target, the current session. */
export function resolveSession(state: TmuxState, target = ''): Result<Session> {
  if (state.sessions.length === 0) return fail('session.none')
  if (target.startsWith('$') && target.length > 1) {
    const session = findSession(state, target.slice(1))
    return session ? ok(session) : fail('target.sessionNotFound', { target })
  }
  const colon = target.indexOf(':')
  return sessionNamed(state, colon < 0 ? target : target.slice(0, colon), target)
}

/**
 * Resolves a `-t` window target. A bare word is a window of the current session if one matches,
 * otherwise a session name, meaning that session's current window.
 */
export function resolveWindow(state: TmuxState, target = ''): Result<WindowLocation> {
  if (state.sessions.length === 0) return fail('session.none')
  if (target.startsWith('@')) {
    const location = locateWindow(state, target.slice(1))
    return location ? ok(location) : fail('target.windowNotFound', { target })
  }
  const parts = splitTarget(target)
  const session = sessionNamed(state, parts.session ?? '', target)
  if (!session.ok) return session
  const found = windowIn(session.value, parts.window, target)
  if (found.ok || parts.session !== null || parts.pane !== null) return found
  const other = byName(state.sessions, parts.window)
  return other ? windowIn(other, '', target) : found
}

/**
 * Resolves a `-t` pane target. A bare word is tried as a pane of the current window first,
 * then as a window or session, meaning its active pane.
 */
export function resolvePane(state: TmuxState, target = ''): Result<PaneLocation> {
  if (state.sessions.length === 0) return fail('session.none')
  if (target.startsWith('%')) {
    const location = locatePane(state, target.slice(1))
    return location ? ok(location) : fail('target.paneNotFound', { target })
  }
  const parts = splitTarget(target)
  const bare = parts.session === null && parts.pane === null && target !== ''
  if (bare) {
    const current = resolveWindow(state)
    const pane = current.ok ? paneIn(current.value, target, target) : current
    if (pane.ok) return pane
  }
  const window = resolveWindow(state, target)
  if (!window.ok) return bare ? fail('target.paneNotFound', { target }) : window
  return paneIn(window.value, parts.pane, target)
}

/** Resolves the `-t` of a command that creates or moves a window: a session, optionally with a window index. */
export function resolveWindowSlot(state: TmuxState, target = ''): Result<WindowSlot> {
  if (state.sessions.length === 0) return fail('session.none')
  const colon = target.indexOf(':')
  const bareIndex = colon < 0 && DIGITS.test(target)
  const sessionName = colon < 0 ? (bareIndex ? '' : target) : target.slice(0, colon)
  const indexText = colon < 0 ? (bareIndex ? target : '') : target.slice(colon + 1)
  const session = sessionNamed(state, sessionName, target)
  if (!session.ok) return session
  if (indexText === '') return ok({ session: session.value, index: null })
  if (!DIGITS.test(indexText)) return fail('target.windowNotFound', { target })
  return ok({ session: session.value, index: Number(indexText) })
}
