import { describe, it, expect } from 'vitest'
import { executeLine } from '../../execute'
import { copyModeKey } from '../../copy-mode'
import { defaultState, emptyState } from '../../state'
import type { KeyId, TmuxState } from '../../types'
import { updatePane, updateWindow } from '../../update'
import { errorOf, must, TYPED } from '../../__tests__/harness'
import { twoSessionState } from '../../__tests__/fixtures'
import { contentOf, deepFreeze, ENGINE, logNames, paneOf } from '../../__tests__/shell-engine'

const run = (state: TmuxState, line: string) => executeLine(state, line, TYPED, ENGINE)
const after = (state: TmuxState, line: string) => must(run(state, line)).state
const press = (state: TmuxState, keys: readonly KeyId[]) => keys.reduce((current, key) => copyModeKey(current, key).state, state)

describe('every buffer command', () => {
  it('needs a server', () => {
    for (const line of ['copy-mode', 'pasteb', 'setb x', 'showb']) {
      expect(errorOf(run(emptyState(), line))).toEqual({ code: 'session.none' })
    }
  })
})

describe('copy-mode', () => {
  it('enters copy mode in the active pane, logging the pane', () => {
    const state = after(twoSessionState(), 'copy-mode')
    expect(state.copyMode).toEqual({ paneId: 'p1', cursor: { row: 0, col: 0 }, anchor: null })
    expect(state.log.at(-1)).toMatchObject({ name: 'copy-mode', detail: { pane: 'p1' } })
  })

  it('enters copy mode in a target pane, on its last line', () => {
    const filled = updatePane(twoSessionState(), 'p2', pane => ({ ...pane, content: ['a', 'b'] }))
    expect(after(filled, 'copy-mode -t %p2').copyMode?.cursor).toEqual({ row: 1, col: 0 })
  })

  it('keeps the cursor when already copying in that pane', () => {
    const moved = press(after(twoSessionState(), 'copy-mode'), ['Space'])
    expect(after(moved, 'copy-mode').copyMode).toEqual(moved.copyMode)
  })

  it('needs an attached client and a real pane', () => {
    expect(errorOf(run({ ...twoSessionState(), isDetached: true }, 'copy-mode'))).toEqual({ code: 'state.detached' })
    expect(errorOf(run(twoSessionState(), 'copy-mode -t %p9'))).toEqual({ code: 'target.paneNotFound', params: { target: '%p9' } })
  })
})

describe('set-buffer / show-buffer', () => {
  it('sets, appends to and shows the buffer by alias', () => {
    const state = after(after(defaultState(), "setb 'one'"), 'set-buffer -a " two"')
    expect(state.clipboard).toBe('one two')
    expect(after(state, 'setb new').clipboard).toBe('new')
    expect(must(run(state, 'showb')).output).toEqual(['one two'])
    expect(must(run({ ...state, clipboard: 'one\ntwo' }, 'show-buffer')).output).toEqual(['one', 'two'])
    expect(logNames(state)).toEqual(['set-buffer', 'set-buffer'])
  })

  it('reports an empty buffer', () => {
    expect(errorOf(run(defaultState(), 'show-buffer'))).toEqual({ code: 'buffer.empty' })
    expect(errorOf(run(defaultState(), 'set-buffer'))).toEqual({ code: 'parse.tooFewArgs', params: { command: 'set-buffer' } })
  })
})

describe('paste-buffer', () => {
  const withClipboard = { ...twoSessionState(), clipboard: 'npm\nrun dev' }

  it('types the buffer at the prompt of the active pane, newlines as spaces', () => {
    const state = after(withClipboard, 'pasteb')
    expect(paneOf(state, 'p1').input).toBe('npm run dev')
    expect(paneOf(state, 'p1').content).toEqual([])
    expect(state.log.at(-1)).toMatchObject({ name: 'paste-buffer', detail: { pane: 'p1', text: 'npm run dev' } })
  })

  it('appends to what is already typed in a target pane, without broadcasting', () => {
    const typed = updatePane(withClipboard, 'p2', pane => ({ ...pane, input: 'x ' }))
    const synced = updateWindow(typed, 'w1', window => ({ ...window, synchronizePanes: true }))
    const state = after(synced, 'paste-buffer -t %p2')
    expect(paneOf(state, 'p2').input).toBe('x npm run dev')
    expect(paneOf(state, 'p1').input).toBe('')
  })

  it('reports an empty buffer', () => {
    expect(errorOf(run(twoSessionState(), 'paste-buffer'))).toEqual({ code: 'buffer.empty' })
  })
})

describe('the whole copy flow', () => {
  it('copies text from one pane and pastes it into another, which then runs it', () => {
    const printed = ENGINE.shell(twoSessionState(), 'p1', "echo 'echo copied text'", TYPED).state
    const copying = after(printed, 'copy-mode')
    expect(copying.copyMode?.cursor).toEqual({ row: 1, col: 0 })
    const copied = press(copying, ['Space', '$', 'y'])
    expect(copied.clipboard).toBe('echo copied text')
    const pasted = after(copied, 'paste-buffer -t %p2')
    const ran = after(pasted, 'send-keys -t %p2 Enter')
    expect(contentOf(ran, 'p2')).toEqual(['$ echo copied text', 'copied text'])
    expect(logNames(ran)).toEqual(['shell', 'copy-mode', 'copy-selection', 'paste-buffer', 'shell', 'send-keys'])
  })

  it('does not change the state it was given', () => {
    const state = deepFreeze({ ...twoSessionState(), clipboard: 'abc' })
    for (const line of ['copy-mode', 'paste-buffer', 'set-buffer -a d', 'show-buffer']) must(run(state, line))
    expect(state.clipboard).toBe('abc')
    expect(state.copyMode).toBeNull()
    expect(paneOf(state, 'p1').input).toBe('')
  })
})
