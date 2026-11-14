import type { Session, TmuxState } from '../types'
import { fail, ok } from '../errors'
import { flagValue, hasFlag } from '../argparse'
import { allocId, createSession, DEFAULT_WINDOW_NAME } from '../state'
import { resolveSession } from '../target'
import { detachClient, removeSession, updateSession } from '../update'
import type { CommandSpec } from './types'
import { loadStartupConfig } from './files'
import { CLIENT_COMMANDS } from './session-client'
import { buildWindow, formatWindowLine, runStartCommand } from './window-shared'

/** Why `name` cannot name a session (other than `selfId`), or null when it can. */
function sessionNameError(state: TmuxState, name: string, selfId: string | null): ReturnType<typeof fail> | null {
  if (name === '' || name.includes(':') || name.includes('.')) return fail('session.badName', { name })
  const taken = state.sessions.some(session => session.name === name && session.id !== selfId)
  return taken ? fail('session.duplicate', { name }) : null
}

/** The lowest number not already used as a session name, as tmux names unnamed sessions. */
function freeSessionName(state: TmuxState): string {
  const used = new Set(state.sessions.map(session => session.name))
  let n = 0
  while (used.has(String(n))) n++
  return String(n)
}

function addSession(state: TmuxState, name: string, windowName: string): { state: TmuxState; session: Session } {
  const sessionId = allocId(state, 's')
  const built = buildWindow(sessionId.state, windowName)
  const session = createSession(sessionId.id, name, [built.window])
  return { state: { ...built.state, sessions: [...built.state.sessions, session] }, session }
}

function formatSessionLine(state: TmuxState, session: Session): string {
  const attached = !state.isDetached && session.id === state.activeSessionId
  return `${session.name}: ${session.windows.length} windows${attached ? ' (attached)' : ''}`
}

/**
 * Only a shell invocation can nest. Without -d the client attaches (from a shell) or switches (inside
 * tmux); inside tmux with no attached client (a config sourced from outside) it only creates.
 */
const newSession: CommandSpec = {
  name: 'new-session',
  aliases: ['new'],
  flags: { d: 'bool', n: 'value', s: 'value', c: 'value' },
  maxArgs: Infinity,
  requiresServer: false,
  run: (state, args, ctx) => {
    const detached = hasFlag(args, 'd')
    if (ctx.fromShell && !state.isDetached && !detached) return fail('session.nested')
    const name = flagValue(args, 's') ?? freeSessionName(state)
    const nameError = sessionNameError(state, name, null)
    if (nameError) return nameError
    const added = addSession(state, name, flagValue(args, 'n') ?? DEFAULT_WINDOW_NAME)
    const attach = !detached && (ctx.fromShell || !state.isDetached)
    const first = state.sessions.length === 0
    const placed: TmuxState = {
      ...added.state,
      activeSessionId: attach || first ? added.session.id : state.activeSessionId,
      isDetached: attach ? false : state.isDetached,
    }
    const config = first ? loadStartupConfig(placed, ctx) : { state: placed, output: [], errors: [] }
    const paneId = added.session.windows[0].activePaneId
    const started = runStartCommand(config.state, paneId, args.positional, ctx, { name })
    return ok({
      ...started,
      output: [...config.output, ...(started.output ?? [])],
      errors: [...config.errors, ...(started.errors ?? [])],
    })
  },
}

const killSession: CommandSpec = {
  name: 'kill-session',
  flags: { a: 'bool', t: 'value' },
  requiresServer: true,
  run: (state, args) => {
    const target = resolveSession(state, flagValue(args, 't'))
    if (!target.ok) return target
    const { id, name } = target.value
    if (!hasFlag(args, 'a')) return ok({ state: removeSession(state, id), detail: { name } })
    const others = state.sessions.filter(session => session.id !== id)
    const remaining = others.reduce((current, session) => removeSession(current, session.id), state)
    return ok({ state: remaining, detail: { name, all: 'true' } })
  },
}

const killServer: CommandSpec = {
  name: 'kill-server',
  flags: {},
  requiresServer: true,
  run: state => {
    const emptied: TmuxState = { ...state, sessions: [], activeSessionId: '' }
    return ok({ state: state.isDetached ? emptied : detachClient(emptied, '[server exited]') })
  },
}

const renameSession: CommandSpec = {
  name: 'rename-session',
  aliases: ['rename'],
  flags: { t: 'value' },
  minArgs: 1,
  maxArgs: 1,
  requiresServer: true,
  run: (state, args) => {
    const target = resolveSession(state, flagValue(args, 't'))
    if (!target.ok) return target
    const name = args.positional[0]
    const nameError = sessionNameError(state, name, target.value.id)
    if (nameError) return nameError
    const renamed = updateSession(state, target.value.id, session => ({ ...session, name }))
    return ok({ state: renamed, detail: { from: target.value.name, name } })
  },
}

const hasSession: CommandSpec = {
  name: 'has-session',
  aliases: ['has'],
  flags: { t: 'value' },
  requiresServer: true,
  run: (state, args) => {
    const target = resolveSession(state, flagValue(args, 't'))
    return target.ok ? ok({ state, detail: { name: target.value.name } }) : target
  },
}

const listSessions: CommandSpec = {
  name: 'list-sessions',
  aliases: ['ls'],
  flags: {},
  requiresServer: true,
  run: state => ok({ state, output: state.sessions.map(session => formatSessionLine(state, session)) }),
}

/** The simulator has no interactive tree, so it prints one: sessions, and their windows unless -s. */
const chooseTree: CommandSpec = {
  name: 'choose-tree',
  flags: { s: 'bool', w: 'bool', Z: 'bool' },
  requiresServer: true,
  run: (state, args) => {
    const withWindows = !hasFlag(args, 's')
    const output = state.sessions.flatMap(session => [
      formatSessionLine(state, session),
      ...(withWindows ? session.windows.map((window, index) => `  ${formatWindowLine(session, window, index)}`) : []),
    ])
    return ok({ state, output })
  },
}

export const SESSION_COMMANDS: readonly CommandSpec[] = [
  newSession,
  ...CLIENT_COMMANDS,
  killSession,
  killServer,
  renameSession,
  hasSession,
  listSessions,
  chooseTree,
]
