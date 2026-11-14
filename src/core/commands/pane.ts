import type { TmuxState, Window } from '../types'
import { fail, ok } from '../errors'
import type { Result } from '../errors'
import { flagValue, hasFlag } from '../argparse'
import type { ParsedArgs } from '../argparse'
import { clampRatio, getAdjacentPane, resizePane, splitPane } from '../layout-engine'
import { windowPanes } from '../selectors'
import { allocId, createPane } from '../state'
import { resolvePane, resolveWindow } from '../target'
import { removePane, updateWindow } from '../update'
import type { CommandOutcome, CommandSpec, RunContext } from './types'
import { paneRect, parseCount } from './pane-shared'
import { PANE_MOVE_COMMANDS } from './pane-move'

/** tmux will not make a pane smaller than this many cells across or down. */
const MIN_PANE_CELLS = 2

const SIZE = /^(\d+)(%?)$/

const DIRECTIONS = { U: 'up', D: 'down', L: 'left', R: 'right' } as const
type DirectionFlag = keyof typeof DIRECTIONS

function directionFlag(args: ParsedArgs): DirectionFlag | null {
  return (['U', 'D', 'L', 'R'] as const).find(flag => hasFlag(args, flag)) ?? null
}

/** The new pane's share of the target pane: `-p percent`, or `-l cells` / `-l percent%`; half by default. */
function newPaneShare(args: ParsedArgs, cells: number): Result<number> {
  const percent = flagValue(args, 'p')
  if (percent !== undefined) {
    const value = parseCount(percent)
    return value.ok ? ok(value.value / 100) : value
  }
  const size = flagValue(args, 'l')
  if (size === undefined) return ok(0.5)
  const match = SIZE.exec(size)
  if (!match) return fail('parse.badNumber', { value: size })
  return ok(match[2] ? Number(match[1]) / 100 : Number(match[1]) / cells)
}

function runInPane(state: TmuxState, paneId: string, words: readonly string[], outcome: CommandOutcome, ctx: RunContext): CommandOutcome {
  if (words.length === 0) return outcome
  const ran = ctx.shell(state, paneId, words.join(' '), ctx)
  return { ...outcome, state: ran.state, output: ran.output, errors: ran.errors }
}

const splitWindow: CommandSpec = {
  name: 'split-window',
  aliases: ['splitw'],
  flags: { h: 'bool', v: 'bool', d: 'bool', b: 'bool', t: 'value', p: 'value', l: 'value' },
  maxArgs: Infinity,
  requiresServer: true,
  run: (state, args, ctx) => {
    const target = resolvePane(state, flagValue(args, 't'))
    if (!target.ok) return target
    const { window, pane } = target.value
    const sideBySide = hasFlag(args, 'h')
    const rect = paneRect(window, pane.id)
    const cells = sideBySide ? rect.width : rect.height
    const share = newPaneShare(args, cells)
    if (!share.ok) return share
    const size = clampRatio(share.value)
    if (cells * size < MIN_PANE_CELLS || cells * (1 - size) < MIN_PANE_CELLS) return fail('pane.noSpace')
    const { state: allocated, id } = allocId(state, 'p')
    const split = updateWindow(allocated, window.id, current => ({
      ...current,
      layoutTree: splitPane(current.layoutTree, pane.id, sideBySide ? 'vertical' : 'horizontal', createPane(id), {
        before: hasFlag(args, 'b'),
        size,
      }),
      activePaneId: hasFlag(args, 'd') ? current.activePaneId : id,
      zoomed: false,
    }))
    const outcome = { state: split, detail: { direction: sideBySide ? 'h' : 'v', pane: id } }
    return ok(runInPane(split, id, args.positional, outcome, ctx))
  },
}

const killPane: CommandSpec = {
  name: 'kill-pane',
  aliases: ['killp'],
  flags: { a: 'bool', t: 'value' },
  requiresServer: true,
  run: (state, args) => {
    const target = resolvePane(state, flagValue(args, 't'))
    if (!target.ok) return target
    const { window, pane } = target.value
    const doomed = hasFlag(args, 'a') ? windowPanes(window).filter(other => other.id !== pane.id) : [pane]
    const next = doomed.reduce((current, victim) => removePane(current, victim.id), state)
    return ok({ state: next, detail: { pane: pane.id } })
  },
}

const selectPane: CommandSpec = {
  name: 'select-pane',
  aliases: ['selectp'],
  flags: { U: 'bool', D: 'bool', L: 'bool', R: 'bool', Z: 'bool', t: 'value' },
  requiresServer: true,
  run: (state, args) => {
    const target = resolvePane(state, flagValue(args, 't'))
    if (!target.ok) return target
    const { window, pane } = target.value
    const flag = directionFlag(args)
    const chosen = flag ? getAdjacentPane(window.layoutTree, pane.id, DIRECTIONS[flag]) : pane.id
    if (!chosen) return ok({ state })
    if (chosen === window.activePaneId) return ok({ state, detail: { pane: chosen } })
    const next = updateWindow(state, window.id, current => ({
      ...current,
      activePaneId: chosen,
      zoomed: hasFlag(args, 'Z') ? current.zoomed : false,
    }))
    return ok({ state: next, detail: { pane: chosen } })
  },
}

/** `resize-pane -Z`: zooms the pane, or unzooms the window; a window of one pane cannot zoom. */
function toggleZoom(state: TmuxState, window: Window, paneId: string): CommandOutcome {
  if (windowPanes(window).length < 2) return { state }
  const zoomed = !window.zoomed
  const next = updateWindow(state, window.id, current => ({ ...current, zoomed, activePaneId: paneId }))
  return { state: next, detail: { pane: paneId, zoomed: String(zoomed) } }
}

const resizePaneCommand: CommandSpec = {
  name: 'resize-pane',
  aliases: ['resizep'],
  flags: { U: 'bool', D: 'bool', L: 'bool', R: 'bool', Z: 'bool', t: 'value' },
  maxArgs: 1,
  requiresServer: true,
  run: (state, args) => {
    const target = resolvePane(state, flagValue(args, 't'))
    if (!target.ok) return target
    const { window, pane } = target.value
    const amount = parseCount(args.positional[0] ?? '1')
    if (!amount.ok) return amount
    if (hasFlag(args, 'Z')) return ok(toggleZoom(state, window, pane.id))
    const flag = directionFlag(args)
    if (!flag) return ok({ state })
    const next = updateWindow(state, window.id, current => ({
      ...current,
      layoutTree: resizePane(current.layoutTree, pane.id, DIRECTIONS[flag], amount.value),
      zoomed: false,
    }))
    return ok({ state: next, detail: { pane: pane.id, direction: flag, amount: String(amount.value) } })
  },
}

const listPanes: CommandSpec = {
  name: 'list-panes',
  aliases: ['lsp'],
  flags: { t: 'value' },
  requiresServer: true,
  run: (state, args) => {
    const target = resolveWindow(state, flagValue(args, 't'))
    if (!target.ok) return target
    const { window } = target.value
    const output = windowPanes(window).map((pane, index) => {
      const { width, height } = paneRect(window, pane.id)
      const active = pane.id === window.activePaneId ? ' (active)' : ''
      return `${index}: [${Math.round(width)}x${Math.round(height)}] %${pane.id}${active}`
    })
    return ok({ state, output })
  },
}

export const PANE_COMMANDS: readonly CommandSpec[] = [
  splitWindow, killPane, selectPane, resizePaneCommand, listPanes, ...PANE_MOVE_COMMANDS,
]
