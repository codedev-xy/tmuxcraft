import { describe, it, expect } from 'vitest'
import { defaultState } from '@/core/state'
import { getActiveWindow } from '@/core/selectors'
import type { TmuxState } from '@/core/types'
import { applyInput, simulate } from '@/game/sim/simulate'
import type { PlayerInput } from '@/game/sim/simulate'
import { click, drag, key, keys, line } from '@/game/sim/inputs'
import { commandEcho } from '../command-echo'

const after = (...inputs: PlayerInput[]): TmuxState => simulate(defaultState(), inputs).state

function echo(state: TmuxState, input: PlayerInput) {
  return commandEcho(state, input, applyInput(state, input).state)
}

describe('commandEcho', () => {
  it('shows the prefix, the key and the binding it ran', () => {
    const state = after(key('C-b'))
    expect(echo(state, key('%'))).toEqual({ kind: 'command', source: { type: 'key', keys: ['C-b', '%'] }, command: 'split-window -h' })
  })

  it('uses the prefix that is set at the time', () => {
    const state = after(line(':set -g prefix C-a'), key('C-a'))
    expect(echo(state, key('"'))).toMatchObject({ source: { keys: ['C-a', '"'] }, command: 'split-window' })
  })

  it('shows a root binding without a prefix', () => {
    const state = after(line(':bind -n M-h select-pane -L'), line(':split-window -h'))
    expect(echo(state, key('M-h'))).toMatchObject({ source: { keys: ['M-h'] }, command: 'select-pane -L' })
  })

  it('says nothing for the prefix alone, for opening a prompt, or for an unbound key', () => {
    expect(echo(defaultState(), key('C-b'))).toBeNull()
    expect(echo(after(key('C-b')), key(','))).toBeNull()
    expect(echo(after(key('C-b')), key(':'))).toBeNull()
    expect(echo(after(key('C-b')), key('Q'))).toBeNull()
  })

  it('names what a copy-mode key ran from the log', () => {
    const state = after(line('echo hello'), ...keys('C-b', '['), key('Space'), key('l'))
    expect(echo(state, key('Enter'))).toMatchObject({ source: { keys: ['Enter'] }, command: 'copy-selection' })
  })

  it('names what a click or a drag ran', () => {
    const state = after(line(':split-window -h'), line(':set -g mouse on'))
    const left = getActiveWindow(state)!.layoutTree.children![0].pane!.id
    expect(echo(state, click(left))).toEqual({ kind: 'command', source: { type: 'click' }, command: 'select-pane' })
    expect(echo(state, drag(left, 'right', 5))).toEqual({ kind: 'command', source: { type: 'drag' }, command: 'resize-pane' })
  })

  it('says nothing for typed lines or for a click that did nothing', () => {
    expect(echo(defaultState(), line(':split-window'))).toBeNull()
    const state = after(line(':split-window -h'))
    const left = getActiveWindow(state)!.layoutTree.children![0].pane!.id
    expect(echo(state, click(left))).toBeNull()
  })
})
