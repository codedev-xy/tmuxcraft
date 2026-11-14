import type { TmuxState, Window } from '../types'
import { fail, ok } from '../errors'
import type { Result } from '../errors'
import { flagValue, hasFlag } from '../argparse'
import type { ParsedArgs } from '../argparse'
import { resolveWindow, resolveWindowSlot } from '../target'
import { insertWindow, removeWindow, updateSession } from '../update'
import type { CommandOutcome, CommandSpec } from './types'
import { selectWindowAt } from './window-shared'

function placeWindow(state: TmuxState, sessionId: string, index: number, window: Window): TmuxState {
  return updateSession(state, sessionId, session => ({
    ...session,
    windows: session.windows.map((current, at) => (at === index ? window : current)),
  }))
}

/**
 * Window indexes are positions, so an index below the session's window count always holds a window:
 * the only free slot is the end, unless the window is moved onto its own index.
 */
function moveWindow(state: TmuxState, args: ParsedArgs): Result<CommandOutcome> {
  const source = resolveWindow(state, flagValue(args, 's'))
  if (!source.ok) return source
  const slot = resolveWindowSlot(state, flagValue(args, 't'))
  if (!slot.ok) return slot
  const { window, session: from, index: fromIndex } = source.value
  const { session: to, index } = slot.value
  const same = from.id === to.id
  const occupied = index !== null && index < to.windows.length ? index : null
  if (occupied !== null && !(same && occupied === fromIndex)) return fail('window.indexInUse', { index: occupied })
  const position = occupied ?? (same ? to.windows.length - 1 : to.windows.length)
  const moved = same && position === fromIndex ? state : insertWindow(removeWindow(state, window.id), to.id, window, null)
  const selected = hasFlag(args, 'd') ? moved : selectWindowAt(moved, to.id, position)
  return ok({ state: selected, detail: { name: window.name, session: to.name, index: String(position) } })
}

function swapWindow(state: TmuxState, args: ParsedArgs): Result<CommandOutcome> {
  const source = resolveWindow(state, flagValue(args, 's'))
  if (!source.ok) return source
  const target = resolveWindow(state, flagValue(args, 't'))
  if (!target.ok) return target
  const a = source.value
  const b = target.value
  const swapped = a.window.id === b.window.id
    ? state
    : placeWindow(placeWindow(state, a.session.id, a.index, b.window), b.session.id, b.index, a.window)
  const selected = hasFlag(args, 'd') ? swapped : selectWindowAt(swapped, b.session.id, b.index)
  return ok({ state: selected, detail: { source: a.window.name, target: b.window.name } })
}

const moveWindowCommand: CommandSpec = {
  name: 'move-window',
  aliases: ['movew'],
  flags: { d: 'bool', s: 'value', t: 'value' },
  requiresServer: true,
  run: (state, args) => moveWindow(state, args),
}

const swapWindowCommand: CommandSpec = {
  name: 'swap-window',
  aliases: ['swapw'],
  flags: { d: 'bool', s: 'value', t: 'value' },
  requiresServer: true,
  run: (state, args) => swapWindow(state, args),
}

export const WINDOW_MOVE_COMMANDS: readonly CommandSpec[] = [moveWindowCommand, swapWindowCommand]
