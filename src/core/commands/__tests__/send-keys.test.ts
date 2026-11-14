import { describe, it, expect } from 'vitest'
import { executeLine } from '../../execute'
import type { ExecContext } from '../types'
import { emptyState } from '../../state'
import type { TmuxState } from '../../types'
import { updatePane, updateWindow } from '../../update'
import { errorOf, must, TYPED } from '../../__tests__/harness'
import { twoSessionState } from '../../__tests__/fixtures'
import { contentOf, deepFreeze, ENGINE, logNames, paneOf, withFiles } from '../../__tests__/shell-engine'

const run = (state: TmuxState, line: string, ctx: ExecContext = TYPED) => executeLine(state, line, ctx, ENGINE)
const after = (line: string, state: TmuxState = twoSessionState()) => must(run(state, line)).state
const inputOf = (state: TmuxState, paneId: string) => paneOf(state, paneId).input

describe('send-keys', () => {
  it('types words at the prompt without spaces between them', () => {
    expect(inputOf(after("send-keys 'npm run' dev"), 'p1')).toBe('npm rundev')
    expect(inputOf(after('send npm Space run'), 'p1')).toBe('npm run')
  })

  it('runs the typed line on Enter or C-m and clears it', () => {
    const state = after("send-keys 'echo hi' Enter 'echo again' C-m")
    expect(contentOf(state, 'p1')).toEqual(['$ echo hi', 'hi', '$ echo again', 'again'])
    expect(inputOf(state, 'p1')).toBe('')
  })

  it('reads key names in any case', () => {
    expect(contentOf(after('send-keys pwd enter'), 'p1')).toEqual(['$ pwd', '~'])
  })

  it('runs what was already at the prompt', () => {
    const typed = updatePane(twoSessionState(), 'p1', pane => ({ ...pane, input: 'echo ' }))
    expect(contentOf(after('send-keys hi Enter', typed), 'p1')).toEqual(['$ echo hi', 'hi'])
  })

  it('logs the shell lines first, then itself with the pane and keys', () => {
    const state = after("send-keys -t %p2 'echo hi' Enter")
    expect(state.log.map(entry => [entry.name, entry.origin])).toEqual([['shell', 'typed'], ['send-keys', 'typed']])
    expect(state.log[1].detail).toEqual({ pane: 'p2', keys: 'echo hi Enter' })
  })

  it('clears the input with C-c and C-u, and the screen with C-l', () => {
    expect(inputOf(after('send-keys abc C-c'), 'p1')).toBe('')
    expect(inputOf(after('send-keys abc C-u def'), 'p1')).toBe('def')
    const printed = after("send-keys 'echo x' Enter")
    expect(contentOf(after('send-keys C-l', printed), 'p1')).toEqual([])
  })

  it('deletes a character with BSpace and types nothing for other keys', () => {
    expect(inputOf(after('send-keys abc BSpace Up Tab M-x C-a d'), 'p1')).toBe('abd')
  })

  it('types every word literally with -l', () => {
    expect(inputOf(after('send-keys -l Enter Space C-c'), 'p1')).toBe('EnterSpaceC-c')
  })

  it('sends to a target pane', () => {
    const state = after("send-keys -t staging 'echo hi' Enter")
    expect(contentOf(state, 'p4')).toEqual(['$ echo hi', 'hi'])
    expect(contentOf(state, 'p1')).toEqual([])
  })

  it('sends to every pane of a synchronized window', () => {
    const synced = updateWindow(twoSessionState(), 'w1', window => ({ ...window, synchronizePanes: true }))
    const state = after("send-keys 'echo hi' Enter", synced)
    expect(contentOf(state, 'p1')).toEqual(['$ echo hi', 'hi'])
    expect(contentOf(state, 'p2')).toEqual(['$ echo hi', 'hi'])
    expect(logNames(state)).toEqual(['shell', 'shell', 'send-keys'])
  })

  it('stops typing into a pane once its shell exits', () => {
    const state = after('send-keys exit Enter abc')
    expect(state.sessions[0].windows[0].activePaneId).toBe('p2')
    expect(inputOf(state, 'p2')).toBe('')
  })

  it('passes shell errors through and stops the tmux line, but still logs itself', () => {
    const result = run(twoSessionState(), 'send-keys nope Enter ; set-buffer x')
    expect(result.ok).toBe(false)
    expect(result.errors).toEqual([{ code: 'shell.commandNotFound', params: { command: 'nope' } }])
    expect(result.state.clipboard).toBe('')
    expect(logNames(result.state)).toEqual(['shell', 'send-keys'])
  })

  it('runs the shell line with its own origin and depth', () => {
    const state = withFiles(twoSessionState(), { '~/a.sh': 'echo deep\n' })
    const result = run(state, 'send-keys "bash a.sh" Enter', { origin: 'config', depth: 5 })
    expect(result.errors).toEqual([{ code: 'script.depth', params: { path: '~/a.sh' } }])
    expect(result.state.log.map(entry => entry.origin)).toEqual(['config', 'config'])
  })

  it('needs keys, a server and a real pane', () => {
    expect(errorOf(run(twoSessionState(), 'send-keys'))).toEqual({ code: 'parse.tooFewArgs', params: { command: 'send-keys' } })
    expect(errorOf(run(emptyState(), 'send-keys a'))).toEqual({ code: 'session.none' })
    expect(errorOf(run(twoSessionState(), 'send-keys -t %p9 a'))).toEqual({ code: 'target.paneNotFound', params: { target: '%p9' } })
  })

  it('works while detached, as scripts use it', () => {
    const state = after("send-keys -t dev 'echo hi' Enter", { ...twoSessionState(), isDetached: true })
    expect(contentOf(state, 'p1')).toEqual(['$ echo hi', 'hi'])
  })

  it('does not change the state it was given', () => {
    const state = deepFreeze(twoSessionState())
    must(run(state, "send-keys 'echo hi' Enter abc"))
    expect(paneOf(state, 'p1')).toMatchObject({ content: [], input: '' })
  })
})
