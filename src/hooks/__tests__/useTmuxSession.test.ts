import { describe, it, expect } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { countPanes } from '@/core/layout-engine'
import { cancelPrompt } from '@/core/prompt'
import { getActiveWindow } from '@/core/selectors'
import { defaultState } from '@/core/state'
import type { TmuxState } from '@/core/types'
import type { InputResult, PlayerInput } from '@/game/sim/simulate'
import { TRANSCRIPT_LIMIT, useTmuxSession } from '../useTmuxSession'

const line = (text: string): PlayerInput => ({ type: 'line', text })
const key = (name: string): PlayerInput => ({ type: 'key', key: name })
const panes = (state: TmuxState) => countPanes(getActiveWindow(state)!.layoutTree)

function start(initial: TmuxState | (() => TmuxState) = defaultState()) {
  const hook = renderHook(() => useTmuxSession(initial))
  const send = (...inputs: PlayerInput[]): InputResult[] => {
    let results: InputResult[] = []
    act(() => { results = inputs.map(input => hook.result.current.send(input)) })
    return results
  }
  return { hook, send, session: () => hook.result.current }
}

describe('useTmuxSession', () => {
  it('starts from the state it is given, with nothing in the transcript', () => {
    const initial = defaultState()
    const { session } = start(initial)
    expect(session().state).toBe(initial)
    expect(session().transcript).toEqual([])
  })

  it('accepts an initializer', () => {
    const { session } = start(defaultState)
    expect(panes(session().state)).toBe(1)
  })

  it('applies a line, hands back what it did and echoes it', () => {
    const { send, session } = start()
    const [result] = send(line(':split-window'))
    expect(result).toMatchObject({ ok: true, counted: true })
    expect(result.state).toBe(session().state)
    expect(panes(session().state)).toBe(2)
    expect(session().transcript).toEqual([{ kind: 'input', text: ':split-window' }])
  })

  it('records output and errors after the echo', () => {
    const { send, session } = start()
    send(line(':list-panes'), line(':select-window -t 99'))
    const transcript = session().transcript
    expect(transcript.map(entry => entry.kind)).toEqual(['input', 'output', 'input', 'error'])
    expect(transcript[3]).toMatchObject({ error: { code: 'target.windowNotFound' } })
  })

  it('applies inputs sent in the same tick on top of each other', () => {
    const { send, session } = start()
    const [prefix, bound] = send(key('C-b'), key('%'))
    expect(prefix).toMatchObject({ handled: true, counted: false })
    expect(bound).toMatchObject({ handled: true, counted: true })
    expect(panes(session().state)).toBe(2)
  })

  it('does not echo keys or blank lines, but records a key\'s error', () => {
    const { send, session } = start()
    send(line('   '), key('C-b'), key('Q'))
    expect(session().transcript).toHaveLength(1)
    expect(session().transcript[0]).toMatchObject({ kind: 'error', error: { code: 'key.unbound' } })
  })

  it('lets the UI change the state without it being an input', () => {
    const { hook, send, session } = start()
    send(key('C-b'), key(','))
    expect(session().state.prompt).not.toBeNull()
    act(() => hook.result.current.update(cancelPrompt))
    expect(session().state.prompt).toBeNull()
    expect(session().transcript).toEqual([])
  })

  it('keeps only the latest transcript entries', () => {
    const { send, session } = start()
    send(...Array.from({ length: TRANSCRIPT_LIMIT + 5 }, (_, i) => line(`echo ${i}`)))
    const transcript = session().transcript
    expect(transcript).toHaveLength(TRANSCRIPT_LIMIT)
    expect(transcript.at(-1)).toEqual({ kind: 'input', text: `echo ${TRANSCRIPT_LIMIT + 4}` })
  })

  it('keeps its state when rendered again with another initial state', () => {
    let initial = defaultState()
    const hook = renderHook(() => useTmuxSession(initial))
    act(() => { hook.result.current.send(line(':split-window')) })
    initial = defaultState()
    hook.rerender()
    expect(panes(hook.result.current.state)).toBe(2)
  })
})
