import type { Session, TmuxState } from '../types'
import { fail, ok } from '../errors'
import type { Result } from '../errors'
import { flagValue, hasFlag } from '../argparse'
import { resolveSession, resolveWindow } from '../target'
import { detachClient } from '../update'
import type { CommandSpec } from './types'
import { selectWindowAt } from './window-shared'

/** Where a client should go: a session, and the window to make current there when one was named. */
interface ClientTarget {
  readonly session: Session
  readonly windowIndex: number | null
}

/** A `-t` that names a session (`dev`, `$s1`) or a window in one (`dev:1`, `@w3`). */
function resolveClientTarget(state: TmuxState, target = ''): Result<ClientTarget> {
  if (target.startsWith('@') || target.includes(':')) {
    const found = resolveWindow(state, target)
    return found.ok ? ok({ session: found.value.session, windowIndex: found.value.index }) : found
  }
  const session = resolveSession(state, target)
  return session.ok ? ok({ session: session.value, windowIndex: null }) : session
}

function attachClient(state: TmuxState, target: ClientTarget): TmuxState {
  const index = target.windowIndex
  const selected = index === null ? state : selectWindowAt(state, target.session.id, index)
  return { ...selected, activeSessionId: target.session.id, isDetached: false }
}

/** The session `step` places away from the attached one in list order, wrapping. */
function cycleSession(state: TmuxState, step: number): ClientTarget {
  const count = state.sessions.length
  const at = state.sessions.findIndex(session => session.id === state.activeSessionId)
  return { session: state.sessions[(at + step + count) % count], windowIndex: null }
}

const attachSession: CommandSpec = {
  name: 'attach-session',
  aliases: ['attach'],
  flags: { d: 'bool', t: 'value' },
  requiresServer: true,
  run: (state, args, ctx) => {
    if (ctx.fromShell && !state.isDetached) return fail('session.nestedAttach')
    const target = resolveClientTarget(state, flagValue(args, 't'))
    if (!target.ok) return target
    return ok({ state: attachClient(state, target.value), detail: { session: target.value.session.name } })
  },
}

const switchClient: CommandSpec = {
  name: 'switch-client',
  aliases: ['switchc'],
  flags: { n: 'bool', p: 'bool', t: 'value' },
  requiresServer: true,
  run: (state, args) => {
    if (state.isDetached) return fail('state.detached')
    const cycling = hasFlag(args, 'n') || hasFlag(args, 'p')
    const target = cycling
      ? ok(cycleSession(state, hasFlag(args, 'n') ? 1 : -1))
      : resolveClientTarget(state, flagValue(args, 't'))
    if (!target.ok) return target
    return ok({ state: attachClient(state, target.value), detail: { session: target.value.session.name } })
  },
}

const detachClientCommand: CommandSpec = {
  name: 'detach-client',
  aliases: ['detach'],
  flags: {},
  requiresServer: true,
  run: state => {
    if (state.isDetached) return fail('state.detached')
    const session = resolveSession(state)
    if (!session.ok) return session
    const { name } = session.value
    return ok({ state: detachClient(state, `[detached (from session ${name})]`), detail: { session: name } })
  },
}

export const CLIENT_COMMANDS: readonly CommandSpec[] = [attachSession, switchClient, detachClientCommand]
