import { describe, it, expect } from 'vitest'
import { executeLine } from '../../execute'
import type { LayoutNode, TmuxState, Window } from '../../types'
import { appendPaneLines, updateWindow } from '../../update'
import { locatePane, locateWindow, windowPanes } from '../../selectors'
import { errorOf, must, runLines, testEngine, TYPED } from '../../__tests__/harness'
import { twoSessionState } from '../../__tests__/fixtures'
import { PANE_COMMANDS } from '../pane'

const ENGINE = testEngine(PANE_COMMANDS)

const run = (state: TmuxState, line: string) => executeLine(state, line, TYPED, ENGINE)
const after = (line: string, state: TmuxState = twoSessionState()) => must(run(state, line)).state
const win = (state: TmuxState, id: string): Window => {
  const found = locateWindow(state, id)
  if (!found) throw new Error(`no window ${id}`)
  return found.window
}
const lastLog = (state: TmuxState) => state.log[state.log.length - 1]
const zoomed = (state: TmuxState, id = 'w1') => updateWindow(state, id, window => ({ ...window, zoomed: true }))
const windowIds = (state: TmuxState, session = 0) => state.sessions[session].windows.map(window => window.id)

function shape(node: LayoutNode): string {
  if (node.pane) return node.pane.id
  const [first, second] = node.children!
  return `(${shape(first)}${node.direction === 'vertical' ? '|' : '/'}${shape(second)})`
}
const shapeOf = (state: TmuxState, id = 'w1') => shape(win(state, id).layoutTree)

/** The fixture with a line of output in every pane, so moves can be checked to keep the pane object. */
const FILLED: TmuxState = ['p1', 'p2', 'p3', 'p4'].reduce((state, id) => appendPaneLines(state, id, [`out ${id}`]), twoSessionState())
const paneObject = (state: TmuxState, id: string) => locatePane(state, id)?.pane

describe('swap-pane', () => {
  it('swaps the active pane with the next one with -D, keeping it active', () => {
    const state = after('swapp -D')
    expect(shapeOf(state)).toBe('(p2|p1)')
    expect(win(state, 'w1').activePaneId).toBe('p1')
    expect(lastLog(state)).toMatchObject({ name: 'swap-pane', detail: { source: 'p2', target: 'p1' } })
  })

  it('swaps with the previous pane with -U, wrapping around', () => {
    const three = after('splitw -h -d -t %p2')
    expect(shapeOf(after('swapp -U', three))).toBe('(p5|(p2|p1))')
    expect(shapeOf(after('swapp -D -t %p5', three))).toBe('(p5|(p2|p1))')
    expect(shapeOf(after('swap-pane -U -t %p2', three))).toBe('(p2|(p1|p5))')
  })

  it('moves whole panes, content included', () => {
    const state = after('swapp -D', FILLED)
    expect(paneObject(state, 'p1')).toBe(paneObject(FILLED, 'p1'))
    expect(windowPanes(win(state, 'w1')).map(pane => pane.content)).toEqual([['out p2'], ['out p1']])
  })

  it('swaps -s with -t, -s defaulting to the active pane', () => {
    expect(shapeOf(after('swapp -s %p2 -t %p1'))).toBe('(p2|p1)')
    expect(shapeOf(after('swapp -t 1'))).toBe('(p2|p1)')
  })

  it('makes the pane that took the active pane\'s place active with -d', () => {
    const state = after('swapp -d -D')
    expect(shapeOf(state)).toBe('(p2|p1)')
    expect(win(state, 'w1').activePaneId).toBe('p2')
    expect(win(after('swapp -d -s %p2 -t %p3'), 'w1').activePaneId).toBe('p1')
  })

  it('swaps panes across windows; the incoming pane becomes active where the active one left', () => {
    const state = after('swapp -s %p1 -t %p3', FILLED)
    expect(shapeOf(state, 'w1')).toBe('(p3|p2)')
    expect(shapeOf(state, 'w2')).toBe('p1')
    expect(win(state, 'w1').activePaneId).toBe('p3')
    expect(win(state, 'w2').activePaneId).toBe('p1')
    expect(paneObject(state, 'p3')).toBe(paneObject(FILLED, 'p3'))
    const kept = after('swapp -s %p2 -t %p4')
    expect(shapeOf(kept, 'w1')).toBe('(p1|p4)')
    expect(win(kept, 'w1').activePaneId).toBe('p1')
    expect(win(kept, 'w3').activePaneId).toBe('p2')
  })

  it('does nothing with -U / -D in a window of one pane', () => {
    expect(after('swapp -D -t server').sessions).toEqual(twoSessionState().sessions)
  })

  it('refuses to swap a pane with itself', () => {
    expect(errorOf(run(twoSessionState(), 'swapp -s %p1 -t %p1'))).toEqual({ code: 'pane.same' })
    expect(errorOf(run(twoSessionState(), 'swapp -t 0'))).toEqual({ code: 'pane.same' })
  })

  it('ends the zoom of the windows involved', () => {
    expect(win(after('swapp -D', zoomed(twoSessionState())), 'w1').zoomed).toBe(false)
  })

  it('reports an unknown pane', () => {
    expect(errorOf(run(twoSessionState(), 'swapp -s %p9 -t %p1'))).toEqual({ code: 'target.paneNotFound', params: { target: '%p9' } })
    expect(errorOf(run(twoSessionState(), 'swapp -D -t %p9'))).toEqual({ code: 'target.paneNotFound', params: { target: '%p9' } })
  })
})

describe('break-pane', () => {
  it('moves the active pane into a new window at the end and makes that window current', () => {
    const state = after('breakp', FILLED)
    expect(windowIds(state)).toEqual(['w1', 'w2', 'w5'])
    expect(win(state, 'w5')).toMatchObject({ name: 'bash', activePaneId: 'p1', zoomed: false, layoutIndex: -1 })
    expect(win(state, 'w5').layoutTree.pane).toBe(paneObject(FILLED, 'p1'))
    expect(shapeOf(state)).toBe('p2')
    expect(win(state, 'w1').activePaneId).toBe('p2')
    expect(state.sessions[0].activeWindowIndex).toBe(2)
    expect(state.nextId).toBe(6)
    expect(lastLog(state)).toMatchObject({ name: 'break-pane', detail: { pane: 'p1', window: 'w5' } })
  })

  it('keeps the current window with -d', () => {
    expect(after('break-pane -d').sessions[0].activeWindowIndex).toBe(0)
  })

  it('moves the -s pane and names the window with -n', () => {
    const state = after('breakp -s %p2 -n logs')
    expect(win(state, 'w5')).toMatchObject({ name: 'logs', activePaneId: 'p2' })
    expect(win(state, 'w1').activePaneId).toBe('p1')
  })

  it('puts the window at the free -t index, in that session', () => {
    expect(windowIds(after('breakp -t :5'))).toEqual(['w1', 'w2', 'w5'])
    const state = after('breakp -t staging:1')
    expect(windowIds(state, 1)).toEqual(['w3', 'w5'])
    expect(state.sessions[1].activeWindowIndex).toBe(1)
    expect(state.sessions[0].activeWindowIndex).toBe(0)
  })

  it('refuses a -t index in use', () => {
    expect(errorOf(run(twoSessionState(), 'breakp -t :1'))).toEqual({ code: 'window.indexInUse', params: { index: 1 } })
  })

  it('refuses to break the only pane of a window', () => {
    expect(errorOf(run(twoSessionState(), 'breakp -s %p3'))).toEqual({ code: 'pane.onlyOne' })
  })

  it('ends the zoom of the window the pane left', () => {
    expect(win(after('breakp', zoomed(twoSessionState())), 'w1').zoomed).toBe(false)
  })

  it('reports unknown targets', () => {
    expect(errorOf(run(twoSessionState(), 'breakp -s %p9'))).toEqual({ code: 'target.paneNotFound', params: { target: '%p9' } })
    expect(errorOf(run(twoSessionState(), 'breakp -t nope:'))).toEqual({ code: 'target.sessionNotFound', params: { target: 'nope:' } })
  })
})

describe('join-pane', () => {
  it('needs -s', () => {
    expect(errorOf(run(twoSessionState(), 'joinp'))).toEqual({ code: 'parse.missingArg', params: { flag: '-s', command: 'join-pane' } })
  })

  it('stacks the -s pane below the active pane, removing its emptied window, and makes it active', () => {
    const state = after('joinp -s %p3', FILLED)
    expect(windowIds(state)).toEqual(['w1'])
    expect(shapeOf(state)).toBe('((p1/p3)|p2)')
    expect(win(state, 'w1').activePaneId).toBe('p3')
    expect(paneObject(state, 'p3')).toBe(paneObject(FILLED, 'p3'))
    expect(lastLog(state)).toMatchObject({ name: 'join-pane', detail: { source: 'p3', target: 'p1' } })
  })

  it('joins side by side with -h and before the target with -b', () => {
    expect(shapeOf(after('join-pane -h -s %p3'))).toBe('((p1|p3)|p2)')
    expect(shapeOf(after('joinp -v -b -s %p3'))).toBe('((p3/p1)|p2)')
    expect(shapeOf(after('joinp -hb -s server'))).toBe('((p3|p1)|p2)')
  })

  it('keeps the active pane and the current window with -d', () => {
    const state = after('joinp -d -s %p2 -t %p3')
    expect(win(state, 'w2').activePaneId).toBe('p3')
    expect(state.sessions[0].activeWindowIndex).toBe(0)
    expect(shapeOf(state, 'w2')).toBe('(p3/p2)')
  })

  it('makes the target window current unless -d', () => {
    const state = after('joinp -s %p2 -t %p3')
    expect(shapeOf(state)).toBe('p1')
    expect(shapeOf(state, 'w2')).toBe('(p3/p2)')
    expect(state.sessions[0].activeWindowIndex).toBe(1)
    expect(win(state, 'w2').activePaneId).toBe('p2')
  })

  it('joins across sessions, removing a session left empty', () => {
    const state = after('joinp -s %p4 -t server')
    expect(state.sessions.map(session => session.name)).toEqual(['dev'])
    expect(shapeOf(state, 'w2')).toBe('(p3/p4)')
    expect(state.isDetached).toBe(false)
  })

  it('moves a pane within its own window', () => {
    expect(shapeOf(after('joinp -h -b -s %p2 -t %p1'))).toBe('(p2|p1)')
  })

  it('refuses to join a pane to itself', () => {
    expect(errorOf(run(twoSessionState(), 'joinp -s %p1'))).toEqual({ code: 'pane.same' })
  })

  it('ends the zoom of both windows', () => {
    const state = after('joinp -s %p2 -t %p3', zoomed(zoomed(twoSessionState()), 'w2'))
    expect(win(state, 'w1').zoomed).toBe(false)
    expect(win(state, 'w2').zoomed).toBe(false)
  })

  it('reports unknown panes', () => {
    expect(errorOf(run(twoSessionState(), 'joinp -s %p9'))).toEqual({ code: 'target.paneNotFound', params: { target: '%p9' } })
    expect(errorOf(run(twoSessionState(), 'joinp -s %p3 -t %p9'))).toEqual({ code: 'target.paneNotFound', params: { target: '%p9' } })
  })

  it('keeps going after a chain of moves', () => {
    const state = runLines(ENGINE, twoSessionState(), ['breakp', 'joinp -h -s %p1 -t %p2', 'swapp -D'])
    expect(windowIds(state)).toEqual(['w1', 'w2'])
    expect(shapeOf(state)).toBe('(p1|p2)')
  })
})
