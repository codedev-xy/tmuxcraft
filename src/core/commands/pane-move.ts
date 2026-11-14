import type { Pane, TmuxState } from '../types'
import { fail, ok } from '../errors'
import type { Result } from '../errors'
import { flagValue, hasFlag } from '../argparse'
import type { ParsedArgs } from '../argparse'
import { containsPane, splitPane } from '../layout-engine'
import { locatePane, windowPanes } from '../selectors'
import type { PaneLocation } from '../selectors'
import { allocId, createWindow, DEFAULT_WINDOW_NAME } from '../state'
import { resolvePane, resolveWindowSlot } from '../target'
import type { WindowSlot } from '../target'
import { insertWindow, mapPanes, removePane, updateWindow } from '../update'
import type { CommandSpec } from './types'
import { showWindow } from './window-shared'

/** The panes `swap-pane` exchanges as `[source, target]`, or null when `-U` / `-D` has no other pane. */
function swapPair(state: TmuxState, args: ParsedArgs): Result<[Pane, Pane] | null> {
  const target = resolvePane(state, flagValue(args, 't'))
  if (!target.ok) return target
  const { window, pane } = target.value
  const step = hasFlag(args, 'U') ? -1 : hasFlag(args, 'D') ? 1 : 0
  if (step !== 0) {
    const panes = windowPanes(window)
    if (panes.length < 2) return ok(null)
    const at = panes.findIndex(other => other.id === pane.id)
    return ok([panes[(at + step + panes.length) % panes.length], pane])
  }
  const source = resolvePane(state, flagValue(args, 's'))
  if (!source.ok) return source
  if (source.value.pane.id === pane.id) return fail('pane.same')
  return ok([source.value.pane, pane])
}

function exchangePanes(state: TmuxState, a: Pane, b: Pane, keepPlace: boolean): TmuxState {
  const swapped = (id: string) => (id === a.id ? b.id : id === b.id ? a.id : id)
  const exchange = (pane: Pane) => (pane.id === a.id ? b : pane.id === b.id ? a : pane)
  const windowIds = [a, b].map(pane => locatePane(state, pane.id)?.window.id ?? '')
  return [...new Set(windowIds)].reduce((current, windowId) => updateWindow(current, windowId, window => {
    const layoutTree = mapPanes(window.layoutTree, exchange)
    const active = window.activePaneId
    const activePaneId = keepPlace || !containsPane(layoutTree, active) ? swapped(active) : active
    return { ...window, layoutTree, activePaneId, zoomed: false }
  }), state)
}

const swapPane: CommandSpec = {
  name: 'swap-pane',
  aliases: ['swapp'],
  flags: { U: 'bool', D: 'bool', d: 'bool', s: 'value', t: 'value' },
  requiresServer: true,
  run: (state, args) => {
    const pair = swapPair(state, args)
    if (!pair.ok) return pair
    if (!pair.value) return ok({ state })
    const [source, target] = pair.value
    const next = exchangePanes(state, source, target, hasFlag(args, 'd'))
    return ok({ state: next, detail: { source: source.id, target: target.id } })
  },
}

/** Where `break-pane` puts the new window: the end of the source pane's session, or a free `-t` slot. */
function breakSlot(state: TmuxState, source: PaneLocation, target: string | undefined): Result<WindowSlot> {
  if (target === undefined) return ok({ session: source.session, index: null })
  const slot = resolveWindowSlot(state, target)
  if (!slot.ok) return slot
  const { session, index } = slot.value
  return index !== null && index < session.windows.length ? fail('window.indexInUse', { index }) : slot
}

const breakPane: CommandSpec = {
  name: 'break-pane',
  aliases: ['breakp'],
  flags: { d: 'bool', s: 'value', n: 'value', t: 'value' },
  requiresServer: true,
  run: (state, args) => {
    const source = resolvePane(state, flagValue(args, 's'))
    if (!source.ok) return source
    const { window, pane } = source.value
    if (windowPanes(window).length < 2) return fail('pane.onlyOne')
    const slot = breakSlot(state, source.value, flagValue(args, 't'))
    if (!slot.ok) return slot
    const { state: allocated, id } = allocId(state, 'w')
    const name = flagValue(args, 'n') ?? DEFAULT_WINDOW_NAME
    const broken = createWindow(id, name, { type: 'pane', pane }, pane.id)
    const moved = insertWindow(removePane(allocated, pane.id), slot.value.session.id, broken, slot.value.index)
    const next = hasFlag(args, 'd') ? moved : showWindow(moved, id)
    return ok({ state: next, detail: { pane: pane.id, window: id } })
  },
}

const joinPane: CommandSpec = {
  name: 'join-pane',
  aliases: ['joinp'],
  flags: { h: 'bool', v: 'bool', d: 'bool', b: 'bool', s: 'value', t: 'value' },
  requiresServer: true,
  run: (state, args) => {
    const sourceTarget = flagValue(args, 's')
    if (sourceTarget === undefined) return fail('parse.missingArg', { flag: '-s', command: 'join-pane' })
    const source = resolvePane(state, sourceTarget)
    if (!source.ok) return source
    const target = resolvePane(state, flagValue(args, 't'))
    if (!target.ok) return target
    const { pane } = source.value
    const { window, pane: into } = target.value
    if (pane.id === into.id) return fail('pane.same')
    const joined = updateWindow(removePane(state, pane.id), window.id, current => ({
      ...current,
      layoutTree: splitPane(current.layoutTree, into.id, hasFlag(args, 'h') ? 'vertical' : 'horizontal', pane, {
        before: hasFlag(args, 'b'),
      }),
      activePaneId: hasFlag(args, 'd') ? current.activePaneId : pane.id,
      zoomed: false,
    }))
    const next = hasFlag(args, 'd') ? joined : showWindow(joined, window.id)
    return ok({ state: next, detail: { source: pane.id, target: into.id } })
  },
}

export const PANE_MOVE_COMMANDS: readonly CommandSpec[] = [swapPane, breakPane, joinPane]
