import { describe, it, expect } from 'vitest'
import { expandFormat, HOST_NAME, renderStatus } from '../status-format'
import { emptyState } from '../state'
import type { TmuxState } from '../types'
import { twoSessionState } from './fixtures'

/** Monday 5 January 2026, 09:07:03 local time. */
const MORNING = new Date(2026, 0, 5, 9, 7, 3)
/** Saturday 31 October 2026, 21:45:59 local time. */
const EVENING = new Date(2026, 9, 31, 21, 45, 59)

/** The fixture with window 1 "server" current in session "dev". */
function secondWindow(): TmuxState {
  const state = twoSessionState()
  return { ...state, sessions: [{ ...state.sessions[0], activeWindowIndex: 1 }, state.sessions[1]] }
}

/** The fixture with pane p2 (index 1) active in window "editor". */
function secondPane(): TmuxState {
  const state = twoSessionState()
  const [editor, server] = state.sessions[0].windows
  const dev = { ...state.sessions[0], windows: [{ ...editor, activePaneId: 'p2' }, server] }
  return { ...state, sessions: [dev, state.sessions[1]] }
}

describe('expandFormat', () => {
  const state = twoSessionState()

  it('expands the short session, window and pane formats', () => {
    expect(expandFormat(state, '[#S] #I:#W.#P', MORNING)).toBe('[dev] 0:editor.0')
    expect(expandFormat(secondWindow(), '#I:#W', MORNING)).toBe('1:server')
    expect(expandFormat(secondPane(), '#P', MORNING)).toBe('1')
  })

  it('expands the host name both ways', () => {
    expect(HOST_NAME).toBe('tmuxcraft')
    expect(expandFormat(state, '#H #h', MORNING)).toBe('tmuxcraft tmuxcraft')
  })

  it('expands the long forms', () => {
    const text = '#{session_name} #{window_name} #{window_index} #{pane_index} #{host}'
    expect(expandFormat(secondPane(), text, MORNING)).toBe('dev editor 0 1 tmuxcraft')
  })

  it('reads ## as a literal #', () => {
    expect(expandFormat(state, '##S ##', MORNING)).toBe('#S #')
  })

  it('drops style runs', () => {
    expect(expandFormat(state, '#[fg=green,bold]#S#[default] x', MORNING)).toBe('dev x')
  })

  it('keeps unknown sequences as written', () => {
    expect(expandFormat(state, '#X #{nope} %Q #', MORNING)).toBe('#X #{nope} %Q #')
    expect(expandFormat(state, '#[unclosed %', MORNING)).toBe('#[unclosed %')
  })

  it('converts the clock with strftime', () => {
    expect(expandFormat(state, '%H:%M:%S %Y %y %m %d', MORNING)).toBe('09:07:03 2026 26 01 05')
    expect(expandFormat(state, '%a %b %p %I', MORNING)).toBe('Mon Jan AM 09')
    expect(expandFormat(state, '%a %b %p %I', EVENING)).toBe('Sat Oct PM 09')
    expect(expandFormat(state, '%R %T %F 100%%', EVENING)).toBe('21:45 21:45:59 2026-10-31 100%')
  })

  it('reads 12-hour midnight and noon as 12', () => {
    expect(expandFormat(state, '%I %p', new Date(2026, 0, 5, 0, 0, 0))).toBe('12 AM')
    expect(expandFormat(state, '%I %p', new Date(2026, 0, 5, 12, 0, 0))).toBe('12 PM')
  })

  it('does not run strftime over names it inserted', () => {
    const named = { ...state, sessions: [{ ...state.sessions[0], name: '100%H' }, state.sessions[1]] }
    expect(expandFormat(named, '#S %H', MORNING)).toBe('100%H 09')
  })

  it('expands to empty values when there is no session', () => {
    expect(expandFormat(emptyState(), '[#S] #I:#W.#P #H', MORNING)).toBe('[] :. tmuxcraft')
  })
})

describe('renderStatus', () => {
  it('builds the default status line', () => {
    expect(renderStatus(secondWindow(), MORNING)).toEqual({
      visible: true,
      position: 'bottom',
      style: 'bg=green,fg=black',
      left: '[dev] ',
      right: '"tmuxcraft"',
      windows: [
        { index: 0, name: 'editor', current: false },
        { index: 1, name: 'server', current: true },
      ],
    })
  })

  it('follows the status options', () => {
    const state = {
      ...twoSessionState(),
      options: {
        status: 'off',
        'status-position': 'top',
        'status-style': 'bg=blue',
        'status-left': '#{session_name}> ',
        'status-right': '%H:%M',
      },
    }
    expect(renderStatus(state, EVENING)).toMatchObject({
      visible: false,
      position: 'top',
      style: 'bg=blue',
      left: 'dev> ',
      right: '21:45',
    })
  })

  it('is null while detached or without a session', () => {
    expect(renderStatus({ ...twoSessionState(), isDetached: true }, MORNING)).toBeNull()
    expect(renderStatus({ ...emptyState(), isDetached: false }, MORNING)).toBeNull()
  })
})
