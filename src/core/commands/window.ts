import type { TmuxState } from '../types'
import { fail, ok } from '../errors'
import type { Result } from '../errors'
import { flagValue, hasFlag } from '../argparse'
import type { ParsedArgs } from '../argparse'
import { DEFAULT_WINDOW_NAME } from '../state'
import { resolveSession, resolveWindow, resolveWindowSlot } from '../target'
import { insertWindow, removeWindow, updateWindow } from '../update'
import type { CommandOutcome, CommandSpec } from './types'
import { WINDOW_MOVE_COMMANDS } from './window-move'
import { buildWindow, formatWindowLine, runStartCommand, selectWindowAt } from './window-shared'

const newWindow: CommandSpec = {
  name: 'new-window',
  aliases: ['neww'],
  flags: { d: 'bool', n: 'value', t: 'value' },
  maxArgs: Infinity,
  requiresServer: true,
  run: (state, args, ctx) => {
    const slot = resolveWindowSlot(state, flagValue(args, 't'))
    if (!slot.ok) return slot
    const { session, index } = slot.value
    if (index !== null && index < session.windows.length) return fail('window.indexInUse', { index })
    const name = flagValue(args, 'n') ?? DEFAULT_WINDOW_NAME
    const built = buildWindow(state, name)
    const position = session.windows.length
    const placed = insertWindow(built.state, session.id, built.window, null)
    const selected = hasFlag(args, 'd') ? placed : selectWindowAt(placed, session.id, position)
    const detail = { name, session: session.name, index: String(position) }
    return ok(runStartCommand(selected, built.window.activePaneId, args.positional, ctx, detail))
  },
}

const killWindow: CommandSpec = {
  name: 'kill-window',
  aliases: ['killw'],
  flags: { a: 'bool', t: 'value' },
  requiresServer: true,
  run: (state, args) => {
    const found = resolveWindow(state, flagValue(args, 't'))
    if (!found.ok) return found
    const { session, window } = found.value
    const detail = { name: window.name, session: session.name }
    if (!hasFlag(args, 'a')) return ok({ state: removeWindow(state, window.id), detail })
    const others = session.windows.filter(other => other.id !== window.id)
    const remaining = others.reduce((current, other) => removeWindow(current, other.id), state)
    return ok({ state: remaining, detail: { ...detail, all: 'true' } })
  },
}

const renameWindow: CommandSpec = {
  name: 'rename-window',
  aliases: ['renamew'],
  flags: { t: 'value' },
  minArgs: 1,
  maxArgs: 1,
  requiresServer: true,
  run: (state, args) => {
    const found = resolveWindow(state, flagValue(args, 't'))
    if (!found.ok) return found
    const { session, window } = found.value
    const name = args.positional[0]
    const renamed = updateWindow(state, window.id, current => ({ ...current, name }))
    return ok({ state: renamed, detail: { from: window.name, name, session: session.name } })
  },
}

/** Selecting only changes the current window of the window's own session; the client stays put. */
const selectWindow: CommandSpec = {
  name: 'select-window',
  aliases: ['selectw'],
  flags: { t: 'value' },
  requiresServer: true,
  run: (state, args) => {
    const target = flagValue(args, 't')
    if (target === undefined) return ok({ state })
    const found = resolveWindow(state, target)
    if (!found.ok) return found
    const { session, window, index } = found.value
    const detail = { name: window.name, session: session.name, index: String(index) }
    return ok({ state: selectWindowAt(state, session.id, index), detail })
  },
}

/** Moves a session's current window `step` places, wrapping; a single window stays current. */
function cycleWindow(state: TmuxState, args: ParsedArgs, step: number): Result<CommandOutcome> {
  const found = resolveSession(state, flagValue(args, 't'))
  if (!found.ok) return found
  const session = found.value
  const count = session.windows.length
  const index = (session.activeWindowIndex + step + count) % count
  const detail = { name: session.windows[index].name, session: session.name, index: String(index) }
  return ok({ state: selectWindowAt(state, session.id, index), detail })
}

const nextWindow: CommandSpec = {
  name: 'next-window',
  aliases: ['next'],
  flags: { t: 'value' },
  requiresServer: true,
  run: (state, args) => cycleWindow(state, args, 1),
}

const previousWindow: CommandSpec = {
  name: 'previous-window',
  aliases: ['prev'],
  flags: { t: 'value' },
  requiresServer: true,
  run: (state, args) => cycleWindow(state, args, -1),
}

const listWindows: CommandSpec = {
  name: 'list-windows',
  aliases: ['lsw'],
  flags: { a: 'bool', t: 'value' },
  requiresServer: true,
  run: (state, args) => {
    if (hasFlag(args, 'a')) {
      const output = state.sessions.flatMap(session =>
        session.windows.map((window, index) => `${session.name}:${formatWindowLine(session, window, index)}`),
      )
      return ok({ state, output })
    }
    const found = resolveSession(state, flagValue(args, 't'))
    if (!found.ok) return found
    const session = found.value
    return ok({ state, output: session.windows.map((window, index) => formatWindowLine(session, window, index)) })
  },
}

export const WINDOW_COMMANDS: readonly CommandSpec[] = [
  newWindow,
  killWindow,
  renameWindow,
  selectWindow,
  nextWindow,
  previousWindow,
  ...WINDOW_MOVE_COMMANDS,
  listWindows,
]
