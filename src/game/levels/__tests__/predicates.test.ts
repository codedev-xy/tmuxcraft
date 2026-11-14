import { describe, it, expect } from 'vitest'
import type { TmuxState, Window } from '@/core/types'
import { getActiveSession, getActiveWindow } from '@/core/selectors'
import { simulate } from '@/game/sim/simulate'
import type { PlayerInput } from '@/game/sim/simulate'
import { makeSession, makeState, makeWindow, paneNode, singlePaneState, split } from '../helpers'
import { attachedTo, hasPanes, isEvenColumn, isEvenRow, isColumn, isGrid, isRow, paneIds, paneShows, ran, ranInOrder, sameIds, sessionNamed, windowNamed } from '../predicates'

const line = (text: string): PlayerInput => ({ type: 'line', text })
const key = (name: string): PlayerInput => ({ type: 'key', key: name })

function after(...inputs: PlayerInput[]): TmuxState {
  return simulate(singlePaneState(), inputs).state
}

function windowAfter(...inputs: PlayerInput[]): Window {
  return getActiveWindow(after(...inputs))!
}

describe('finding things by name', () => {
  const state = after(line(':new-window -n logs'), line(':new-session -d -s staging'))

  it('finds a session by name', () => {
    expect(sessionNamed(state, 'staging')?.name).toBe('staging')
    expect(sessionNamed(state, 'missing')).toBeNull()
  })

  it('finds a window by name in a session', () => {
    expect(windowNamed(getActiveSession(state), 'logs')?.name).toBe('logs')
    expect(windowNamed(getActiveSession(state), 'missing')).toBeNull()
    expect(windowNamed(null, 'logs')).toBeNull()
  })

  it('lists pane ids left to right, top to bottom', () => {
    const tree = split('vertical', paneNode('p1'), split('horizontal', paneNode('p2'), paneNode('p3')))
    expect(paneIds(makeWindow('w1', 'bash', tree, 'p1'))).toEqual(['p1', 'p2', 'p3'])
  })

  it('compares id lists whatever their order', () => {
    expect(sameIds(['p2', 'p1'], ['p1', 'p2'])).toBe(true)
    expect(sameIds(['p1'], ['p1', 'p2'])).toBe(false)
    expect(sameIds(['p1', 'p3'], ['p1', 'p2'])).toBe(false)
    expect(sameIds(['p1', 'p1'], ['p1', 'p2'])).toBe(false)
    expect(sameIds(['p1', 'p2'], ['p1', 'p1'])).toBe(false)
  })

  it('tells whether a window holds exactly the given panes', () => {
    const window = makeWindow('w1', 'bash', split('vertical', paneNode('p1'), paneNode('p2')), 'p1')
    expect(hasPanes(window, ['p2', 'p1'])).toBe(true)
    expect(hasPanes(window, ['p1'])).toBe(false)
    expect(hasPanes(window, ['p1', 'p2', 'p3'])).toBe(false)
    expect(hasPanes(null, [])).toBe(false)
  })

  it('tells which session the client is attached to', () => {
    expect(attachedTo(state, '0')).toBe(true)
    expect(attachedTo(state, 'staging')).toBe(false)
    expect(attachedTo(after(key('C-b'), key('d')), '0')).toBe(false)
  })
})

describe('layout shapes', () => {
  it('sees panes side by side as a row', () => {
    const two = windowAfter(line(':split-window -h'))
    expect(isRow(two, 2)).toBe(true)
    expect(isRow(two, 3)).toBe(false)
    expect(isColumn(two, 2)).toBe(false)
  })

  it('sees stacked panes as a column', () => {
    const two = windowAfter(line(':split-window -v'))
    expect(isColumn(two, 2)).toBe(true)
    expect(isRow(two, 2)).toBe(false)
  })

  it('does not call a mixed layout a row or a column', () => {
    const mixed = windowAfter(line(':split-window -h'), line(':split-window -v'))
    expect(isRow(mixed, 3)).toBe(false)
    expect(isColumn(mixed, 3)).toBe(false)
  })

  it('tells an even row from one that was only split twice', () => {
    const uneven = windowAfter(line(':split-window -h'), line(':split-window -h'))
    expect(isRow(uneven, 3)).toBe(true)
    expect(isEvenRow(uneven, 3)).toBe(false)
    const even = windowAfter(line(':split-window -h'), line(':split-window -h'), line(':select-layout even-horizontal'))
    expect(isEvenRow(even, 3)).toBe(true)
  })

  it('tells an even column from an uneven one', () => {
    const uneven = windowAfter(line(':split-window -v'), line(':split-window -v'))
    expect(isEvenColumn(uneven, 3)).toBe(false)
    const even = windowAfter(line(':split-window -v'), line(':split-window -v'), line(':select-layout even-vertical'))
    expect(isEvenColumn(even, 3)).toBe(true)
  })

  it('accepts a 2x2 grid however it was split', () => {
    const columnsFirst = windowAfter(line(':split-window -h'), line(':split-window -v'), line(':select-pane -L'), line(':split-window -v'))
    const rowsFirst = windowAfter(line(':split-window -v'), line(':split-window -h'), line(':select-pane -U'), line(':split-window -h'))
    expect(isGrid(columnsFirst, 2, 2)).toBe(true)
    expect(isGrid(rowsFirst, 2, 2)).toBe(true)
  })

  it('does not accept four panes that are not a grid', () => {
    const strips = windowAfter(line(':split-window -h'), line(':split-window -h'), line(':split-window -h'))
    const lopsided = windowAfter(line(':split-window -h'), line(':split-window -v'), line(':split-window -v'))
    expect(isGrid(strips, 2, 2)).toBe(false)
    expect(isGrid(lopsided, 2, 2)).toBe(false)
  })

  it('does not accept a grid whose cells were resized', () => {
    const tree = split('vertical', split('horizontal', paneNode('p1'), paneNode('p2'), 0.7), split('horizontal', paneNode('p3'), paneNode('p4')))
    expect(isGrid(makeWindow('w1', 'bash', tree, 'p1'), 2, 2)).toBe(false)
  })
})

describe('what happened', () => {
  it('knows a command ran', () => {
    const state = after(line(':split-window -h'))
    expect(ran(state, 'split-window')).toBe(true)
    expect(ran(state, 'kill-pane')).toBe(false)
  })

  it('does not count a command that failed', () => {
    expect(ran(after(line(':select-window -t :9')), 'select-window')).toBe(false)
  })

  it('tells how a command was run', () => {
    const typed = after(line(':split-window -h'))
    const pressed = after(key('C-b'), key('%'))
    expect(ran(typed, { name: 'split-window', origin: 'key' })).toBe(false)
    expect(ran(pressed, { name: 'split-window', origin: 'key' })).toBe(true)
    expect(ran(pressed, { name: 'split-window', key: '%' })).toBe(true)
    expect(ran(pressed, { name: 'split-window', key: '"' })).toBe(false)
  })

  it('matches on the details a command recorded', () => {
    const state = after(line(':split-window -h'))
    expect(ran(state, { name: 'split-window', detail: { direction: 'h' } })).toBe(true)
    expect(ran(state, { name: 'split-window', detail: { direction: 'v' } })).toBe(false)
  })

  it('matches a shell line word by word, whatever its spacing and quoting', () => {
    const state = after(line('  echo   "deploy" '))
    expect(ran(state, { name: 'shell', line: 'echo deploy' })).toBe(true)
    expect(ran(state, { name: 'shell', line: 'echo deploy now' })).toBe(false)
    expect(ran(state, { name: 'shell', line: 'echo' })).toBe(false)
    expect(ran(after(line('echo deploy; clear')), { name: 'shell', line: 'echo deploy' })).toBe(false)
  })

  it('tells which file a command came from', () => {
    const files = { '~/a.conf': 'set -g mouse on\n' }
    const state = simulate({ ...singlePaneState(), files }, [line(':source-file a.conf'), line(':set -g status off')]).state
    expect(ran(state, { name: 'set-option', file: '~/a.conf', detail: { option: 'mouse' } })).toBe(true)
    expect(ran(state, { name: 'set-option', file: '~/a.conf', detail: { option: 'status' } })).toBe(false)
    expect(ran(state, { name: 'set-option', file: '~/b.conf' })).toBe(false)
  })

  it('checks that things happened in order', () => {
    const state = after(line(':detach-client'), line('tmux attach'))
    expect(ranInOrder(state, 'detach-client', 'attach-session')).toBe(true)
    expect(ranInOrder(state, 'attach-session', 'detach-client')).toBe(false)
    expect(ranInOrder(state, 'detach-client', 'detach-client')).toBe(false)
  })

  it('lets other commands come in between', () => {
    const state = after(line(':split-window -h'), line(':new-window'), line(':kill-pane'))
    expect(ranInOrder(state, 'split-window', 'kill-pane')).toBe(true)
  })
})

describe('what a pane shows', () => {
  it('finds text in a pane\'s scrollback', () => {
    const state = after(line('echo deploy ok'))
    expect(paneShows(state, 'p1', 'deploy ok')).toBe(true)
    expect(paneShows(state, 'p1', 'deploy failed')).toBe(false)
  })

  it('is false for a pane that is gone', () => {
    expect(paneShows(singlePaneState(), 'p9', '')).toBe(false)
  })

  it('looks in every session', () => {
    const other = makeSession('s2', 'other', [makeWindow('w2', 'bash', paneNode('p2', ['hello']), 'p2')])
    const state = makeState([...singlePaneState().sessions, other], 's1')
    expect(paneShows(state, 'p2', 'hello')).toBe(true)
  })
})
