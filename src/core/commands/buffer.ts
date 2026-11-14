import { fail, ok } from '../errors'
import { flagValue, hasFlag } from '../argparse'
import { enterCopyMode } from '../copy-mode'
import { resolvePane } from '../target'
import { updatePane } from '../update'
import type { CommandSpec } from './types'

const copyMode: CommandSpec = {
  name: 'copy-mode',
  flags: { t: 'value' },
  requiresServer: true,
  run: (state, args) => {
    if (state.isDetached) return fail('state.detached')
    const target = resolvePane(state, flagValue(args, 't'))
    if (!target.ok) return target
    const paneId = target.value.pane.id
    const next = state.copyMode?.paneId === paneId ? state : enterCopyMode(state, paneId)
    return ok({ state: next, detail: { pane: paneId } })
  },
}

/** Types the buffer at the pane's prompt; unlike typing, a paste goes to one pane even when synchronized. */
const pasteBuffer: CommandSpec = {
  name: 'paste-buffer',
  aliases: ['pasteb'],
  flags: { t: 'value' },
  requiresServer: true,
  run: (state, args) => {
    if (state.clipboard === '') return fail('buffer.empty')
    const target = resolvePane(state, flagValue(args, 't'))
    if (!target.ok) return target
    const paneId = target.value.pane.id
    const text = state.clipboard.replace(/\r?\n/g, ' ')
    return ok({ state: updatePane(state, paneId, pane => ({ ...pane, input: pane.input + text })), detail: { pane: paneId } })
  },
}

const setBuffer: CommandSpec = {
  name: 'set-buffer',
  aliases: ['setb'],
  flags: { a: 'bool' },
  minArgs: 1,
  maxArgs: 1,
  requiresServer: true,
  run: (state, args) => {
    const text = args.positional[0]
    return ok({ state: { ...state, clipboard: hasFlag(args, 'a') ? state.clipboard + text : text } })
  },
}

const showBuffer: CommandSpec = {
  name: 'show-buffer',
  aliases: ['showb'],
  flags: {},
  requiresServer: true,
  run: state => (state.clipboard === '' ? fail('buffer.empty') : ok({ state, output: state.clipboard.split('\n') })),
}

export const BUFFER_COMMANDS: readonly CommandSpec[] = [copyMode, pasteBuffer, setBuffer, showBuffer]
