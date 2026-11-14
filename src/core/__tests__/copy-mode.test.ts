import { describe, it, expect } from 'vitest'
import { copyModeKey, enterCopyMode, selectionRange } from '../copy-mode'
import { defaultState } from '../state'
import type { KeyId, TmuxState } from '../types'
import { updatePane } from '../update'
import { deepFreeze } from './shell-engine'

const LINES = ['first line', 'ab', '', 'last one']

function withContent(content: readonly string[]): TmuxState {
  return updatePane(defaultState(), 'p1', pane => ({ ...pane, content: [...content] }))
}

function press(state: TmuxState, keys: readonly KeyId[]): TmuxState {
  return keys.reduce((current, key) => copyModeKey(current, key).state, state)
}

const copying = () => enterCopyMode(withContent(LINES), 'p1')
const cursorAfter = (keys: readonly KeyId[], state = copying()) => press(state, keys).copyMode?.cursor

describe('enterCopyMode', () => {
  it('puts the cursor at the start of the last line, with nothing selected', () => {
    expect(copying().copyMode).toEqual({ paneId: 'p1', cursor: { row: 3, col: 0 }, anchor: null })
  })

  it('puts the cursor on row 0 in an empty pane', () => {
    expect(enterCopyMode(defaultState(), 'p1').copyMode?.cursor).toEqual({ row: 0, col: 0 })
  })

  it('ignores a pane that does not exist', () => {
    const state = defaultState()
    expect(enterCopyMode(state, 'p9')).toBe(state)
  })
})

describe('copyModeKey movement', () => {
  it('is not handled outside copy mode', () => {
    const state = withContent(LINES)
    expect(copyModeKey(state, 'k')).toEqual({ state, handled: false })
  })

  it('handles unknown keys by doing nothing', () => {
    const state = copying()
    expect(copyModeKey(state, 'x')).toEqual({ state, handled: true })
  })

  it('moves with arrows and hjkl', () => {
    expect(cursorAfter(['Up', 'Up', 'Up', 'l', 'Right'])).toEqual({ row: 0, col: 2 })
    expect(cursorAfter(['k', 'k', 'k', '$', 'h', 'Left', 'j'])).toEqual({ row: 1, col: 1 })
    expect(cursorAfter(['g', 'Down'])).toEqual({ row: 1, col: 0 })
  })

  it('clamps the cursor to the content and to each line', () => {
    expect(cursorAfter(['Down', 'j', 'Left', 'h'])).toEqual({ row: 3, col: 0 })
    expect(cursorAfter(['g', 'k', '$', 'l', 'l'])).toEqual({ row: 0, col: 9 })
    expect(cursorAfter(['g', '$', 'j'])).toEqual({ row: 1, col: 1 })
    expect(cursorAfter(['g', '$', 'j', 'j'])).toEqual({ row: 2, col: 0 })
  })

  it('jumps to line start, line end, first and last rows', () => {
    expect(cursorAfter(['$'])).toEqual({ row: 3, col: 7 })
    expect(cursorAfter(['$', '0'])).toEqual({ row: 3, col: 0 })
    expect(cursorAfter(['$', '^'])).toEqual({ row: 3, col: 0 })
    expect(cursorAfter(['g'])).toEqual({ row: 0, col: 0 })
    expect(cursorAfter(['g', 'G'])).toEqual({ row: 3, col: 0 })
  })
})

describe('copyModeKey selection', () => {
  it.each(['Space', 'v', 'C-Space'])('%s sets the anchor at the cursor', key => {
    expect(press(copying(), ['$', key]).copyMode?.anchor).toEqual({ row: 3, col: 7 })
  })

  it.each(['Enter', 'y', 'M-w'])('%s copies the selection, leaves copy mode and logs it', key => {
    const state = press(copying(), ['l', 'Space', 'l', 'l', key])
    expect(state.clipboard).toBe('ast')
    expect(state.copyMode).toBeNull()
    expect(state.log).toEqual([{ seq: 1, name: 'copy-selection', origin: 'key', key, detail: { text: 'ast' } }])
  })

  it('copies across lines, in either direction', () => {
    const forward = press(copying(), ['g', 'l', 'l', 'l', 'l', 'l', 'l', 'Space', 'j', 'j', 'j', 'l', 'l', 'Enter'])
    expect(forward.clipboard).toBe('line\nab\n\nlas')
    const backward = press(copying(), ['l', 'l', 'Space', 'g', 'l', 'l', 'l', 'l', 'l', 'l', 'y'])
    expect(backward.clipboard).toBe('line\nab\n\nlas')
  })

  it('leaves copy mode without copying when nothing is selected', () => {
    const state = press(copying(), ['Enter'])
    expect(state.copyMode).toBeNull()
    expect(state.clipboard).toBe('')
    expect(state.log).toEqual([])
  })

  it.each(['q', 'Escape'])('%s leaves copy mode without copying', key => {
    const state = press(copying(), ['Space', 'l', key])
    expect(state.copyMode).toBeNull()
    expect(state.clipboard).toBe('')
  })

  it('does not change the state it was given', () => {
    const state = deepFreeze(copying())
    press(state, ['Up', 'Space', '$', 'y'])
    expect(state.copyMode?.cursor).toEqual({ row: 3, col: 0 })
    expect(state.clipboard).toBe('')
  })
})

describe('selectionRange', () => {
  it('is null outside copy mode or without an anchor', () => {
    expect(selectionRange(defaultState())).toBeNull()
    expect(selectionRange(copying())).toBeNull()
  })

  it('orders the anchor and cursor', () => {
    expect(selectionRange(press(copying(), ['l', 'Space', 'k', 'h']))).toEqual({ start: { row: 2, col: 0 }, end: { row: 3, col: 1 } })
    expect(selectionRange(press(copying(), ['Space', 'l', 'l']))).toEqual({ start: { row: 3, col: 0 }, end: { row: 3, col: 2 } })
  })
})
