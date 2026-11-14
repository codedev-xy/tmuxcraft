import type { TmuxState, Window } from '../types'
import { fail, ok } from '../errors'
import type { Result } from '../errors'
import { flagValue, hasFlag } from '../argparse'
import type { ParsedArgs } from '../argparse'
import { applyPresetLayout, PRESET_LAYOUTS } from '../layout-engine'
import { windowPanes } from '../selectors'
import { resolveWindow } from '../target'
import { updateWindow } from '../update'
import type { CommandOutcome, CommandSpec } from './types'

function applyLayout(state: TmuxState, window: Window, index: number): CommandOutcome {
  const layout = PRESET_LAYOUTS[index]
  const next = updateWindow(state, window.id, current => ({
    ...current,
    layoutTree: applyPresetLayout(windowPanes(current), layout),
    layoutIndex: index,
    zoomed: false,
  }))
  return { state: next, detail: { layout } }
}

/** The preset `step` away in the cycle; before any preset, next is the first and previous the last. */
function cycled(window: Window, step: 1 | -1): number {
  const count = PRESET_LAYOUTS.length
  if (window.layoutIndex < 0) return step === 1 ? 0 : count - 1
  return (window.layoutIndex + step + count) % count
}

/** The preset `select-layout` applies; null when there is none to re-apply. */
function chosenIndex(window: Window, args: ParsedArgs): Result<number | null> {
  if (hasFlag(args, 'n')) return ok(cycled(window, 1))
  if (hasFlag(args, 'p')) return ok(cycled(window, -1))
  const name = args.positional[0]
  if (name === undefined) return ok(window.layoutIndex >= 0 ? window.layoutIndex : null)
  const index = PRESET_LAYOUTS.findIndex(layout => layout === name)
  return index < 0 ? fail('layout.unknown', { layout: name }) : ok(index)
}

const selectLayout: CommandSpec = {
  name: 'select-layout',
  aliases: ['selectl'],
  flags: { n: 'bool', p: 'bool', t: 'value' },
  maxArgs: 1,
  requiresServer: true,
  run: (state, args) => {
    const target = resolveWindow(state, flagValue(args, 't'))
    if (!target.ok) return target
    const { window } = target.value
    const index = chosenIndex(window, args)
    if (!index.ok) return index
    return ok(index.value === null ? { state } : applyLayout(state, window, index.value))
  },
}

function cycleCommand(name: string, alias: string, step: 1 | -1): CommandSpec {
  return {
    name,
    aliases: [alias],
    flags: { t: 'value' },
    requiresServer: true,
    run: (state, args) => {
      const target = resolveWindow(state, flagValue(args, 't'))
      if (!target.ok) return target
      const { window } = target.value
      return ok(applyLayout(state, window, cycled(window, step)))
    },
  }
}

export const LAYOUT_COMMANDS: readonly CommandSpec[] = [
  selectLayout,
  cycleCommand('next-layout', 'nextl', 1),
  cycleCommand('previous-layout', 'prevl', -1),
]
