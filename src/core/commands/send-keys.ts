import type { Pane, TmuxState } from '../types'
import type { TmuxError } from '../errors'
import { ok } from '../errors'
import { flagValue, hasFlag } from '../argparse'
import { normalizeKey } from '../keymap'
import { findPane, windowPanes } from '../selectors'
import { resolvePane } from '../target'
import { updatePane } from '../update'
import type { CommandSpec, ExecContext, RunContext } from './types'

interface Sent {
  readonly state: TmuxState
  readonly output: readonly string[]
  readonly errors: readonly TmuxError[]
}

/** What a named key does to the pane's prompt; a key not listed here (`Up`, `Tab`, `M-x`) types nothing. */
const KEY_EDITS: Readonly<Record<string, (pane: Pane) => Pane>> = {
  Space: pane => ({ ...pane, input: `${pane.input} ` }),
  'C-c': pane => ({ ...pane, input: '' }),
  'C-u': pane => ({ ...pane, input: '' }),
  'C-l': pane => ({ ...pane, content: [] }),
  BSpace: pane => ({ ...pane, input: pane.input.slice(0, -1) }),
}

const ENTER_KEYS: ReadonlySet<string> = new Set(['Enter', 'C-m'])

/** Runs what sits at the prompt, clearing it first so the line can type into its own pane. */
function pressEnter(sent: Sent, paneId: string, ctx: RunContext): Sent {
  const line = findPane(sent.state, paneId)?.input ?? ''
  const cleared = updatePane(sent.state, paneId, pane => ({ ...pane, input: '' }))
  const shellCtx: ExecContext = ctx.depth === undefined ? { origin: ctx.origin } : { origin: ctx.origin, depth: ctx.depth }
  const result = ctx.shell(cleared, paneId, line, shellCtx)
  return { state: result.state, output: [...sent.output, ...result.output], errors: [...sent.errors, ...result.errors] }
}

/** A word is a key when tmux can read it as one; a single character is just typed. */
function sendWord(sent: Sent, paneId: string, word: string, literal: boolean, ctx: RunContext): Sent {
  const key = literal ? null : normalizeKey(word)
  if (key === null || key.length === 1) {
    return { ...sent, state: updatePane(sent.state, paneId, pane => ({ ...pane, input: pane.input + word })) }
  }
  if (ENTER_KEYS.has(key)) return pressEnter(sent, paneId, ctx)
  if (!Object.hasOwn(KEY_EDITS, key)) return sent
  return { ...sent, state: updatePane(sent.state, paneId, KEY_EDITS[key]) }
}

/** Sends every word to one pane, stopping if the pane goes away (its shell ran `exit`). */
function sendToPane(sent: Sent, paneId: string, words: readonly string[], literal: boolean, ctx: RunContext): Sent {
  return words.reduce(
    (current, word) => (findPane(current.state, paneId) ? sendWord(current, paneId, word, literal, ctx) : current),
    sent,
  )
}

/** `send-keys [-t pane] [-l] key…`: types into a pane as if at its keyboard, so `Enter` runs the line. */
const sendKeys: CommandSpec = {
  name: 'send-keys',
  aliases: ['send'],
  flags: { t: 'value', l: 'bool' },
  minArgs: 1,
  maxArgs: Infinity,
  requiresServer: true,
  run: (state, args, ctx) => {
    const target = resolvePane(state, flagValue(args, 't'))
    if (!target.ok) return target
    const { window, pane } = target.value
    const paneIds = window.synchronizePanes ? windowPanes(window).map(each => each.id) : [pane.id]
    const literal = hasFlag(args, 'l')
    const start: Sent = { state, output: [], errors: [] }
    const sent = paneIds.reduce((current, paneId) => sendToPane(current, paneId, args.positional, literal, ctx), start)
    return ok({ ...sent, detail: { pane: pane.id, keys: args.positional.join(' ') } })
  },
}

export const SEND_KEYS_COMMANDS: readonly CommandSpec[] = [sendKeys]
