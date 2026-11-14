import { describe, it, expect } from 'vitest'
import { executeLine } from '../../execute'
import { emptyState } from '../../state'
import type { LayoutNode, TmuxState, Window } from '../../types'
import { appendPaneLines, updatePane, updateWindow } from '../../update'
import { locateWindow, windowPanes } from '../../selectors'
import { errorOf, must, runLines, testEngine, TYPED } from '../../__tests__/harness'
import { twoSessionState } from '../../__tests__/fixtures'
import { PANE_COMMANDS } from '../pane'
import { LAYOUT_COMMANDS } from '../layout'

const ENGINE = testEngine([...PANE_COMMANDS, ...LAYOUT_COMMANDS])

const run = (state: TmuxState, line: string) => executeLine(state, line, TYPED, ENGINE)
const after = (line: string, state: TmuxState = threePanes()) => must(run(state, line)).state
const win = (state: TmuxState, id = 'w1'): Window => {
  const found = locateWindow(state, id)
  if (!found) throw new Error(`no window ${id}`)
  return found.window
}
const lastLog = (state: TmuxState) => state.log[state.log.length - 1]

function shape(node: LayoutNode): string {
  if (node.pane) return node.pane.id
  const [first, second] = node.children!
  return `(${shape(first)}${node.direction === 'vertical' ? '|' : '/'}${shape(second)})`
}
const shapeOf = (state: TmuxState, id = 'w1') => shape(win(state, id).layoutTree)

/** dev:editor holds p1 | p2 / p5 with output in every pane and text typed into p2; nothing logged. */
function threePanes(): TmuxState {
  const split = runLines(ENGINE, twoSessionState(), ['splitw -d -t %p2'])
  const filled = ['p1', 'p2', 'p5'].reduce((state, id) => appendPaneLines(state, id, [`out ${id}`]), split)
  return { ...updatePane(filled, 'p2', pane => ({ ...pane, input: 'vim' })), log: [] }
}

const EVEN_H = '((p1|p2)|p5)'
const EVEN_V = '((p1/p2)/p5)'
const MAIN_H = '(p1/(p2|p5))'
const MAIN_V = '(p1|(p2/p5))'
const TILED = '((p1|p2)/p5)'

describe('select-layout', () => {
  it('applies each preset by name and records it', () => {
    const cases: [string, string, number][] = [
      ['even-horizontal', EVEN_H, 0], ['even-vertical', EVEN_V, 1], ['main-horizontal', MAIN_H, 2],
      ['main-vertical', MAIN_V, 3], ['tiled', TILED, 4],
    ]
    for (const [layout, picture, index] of cases) {
      const state = after(`selectl ${layout}`)
      expect(shapeOf(state)).toBe(picture)
      expect(win(state).layoutIndex).toBe(index)
      expect(lastLog(state)).toMatchObject({ name: 'select-layout', detail: { layout } })
    }
  })

  it('keeps pane content, typed input and the active pane', () => {
    const before = windowPanes(win(threePanes()))
    const state = after('select-layout tiled')
    expect(windowPanes(win(state))).toEqual(before)
    expect(win(state).activePaneId).toBe('p1')
  })

  it('works on the -t window', () => {
    const state = after('splitw -d -t server ; selectl -t server even-horizontal')
    expect(shapeOf(state, 'w2')).toBe('(p3|p6)')
    expect(shapeOf(state)).toBe(shapeOf(threePanes()))
  })

  it('rejects an unknown layout name', () => {
    expect(errorOf(run(threePanes(), 'selectl spiral'))).toEqual({ code: 'layout.unknown', params: { layout: 'spiral' } })
    expect(errorOf(run(threePanes(), 'selectl even'))).toEqual({ code: 'layout.unknown', params: { layout: 'even' } })
  })

  it('re-applies the last preset when given no name', () => {
    const reset = after('selectl main-vertical ; resizep -t %p1 -R 10 ; selectl')
    expect(win(reset).layoutTree).toEqual(win(after('selectl main-vertical')).layoutTree)
    expect(lastLog(reset).detail).toEqual({ layout: 'main-vertical' })
  })

  it('does nothing with no name before any preset', () => {
    const state = after('selectl')
    expect(state.sessions).toEqual(threePanes().sessions)
    expect(lastLog(state).name).toBe('select-layout')
  })

  it('moves through the cycle with -n and -p', () => {
    expect(win(after('selectl -n')).layoutIndex).toBe(0)
    expect(win(after('selectl -p')).layoutIndex).toBe(4)
    expect(shapeOf(after('selectl even-vertical ; selectl -n'))).toBe(MAIN_H)
  })

  it('ends the zoom', () => {
    const zoomed = updateWindow(threePanes(), 'w1', window => ({ ...window, zoomed: true }))
    expect(win(after('selectl tiled', zoomed)).zoomed).toBe(false)
  })

  it('reports an unknown window', () => {
    expect(errorOf(run(threePanes(), 'selectl -t nope tiled'))).toEqual({ code: 'target.windowNotFound', params: { target: 'nope' } })
  })
})

describe('next-layout and previous-layout', () => {
  it('start the cycle at even-horizontal and tiled', () => {
    expect(shapeOf(after('nextl'))).toBe(EVEN_H)
    expect(lastLog(after('next-layout'))).toMatchObject({ name: 'next-layout', detail: { layout: 'even-horizontal' } })
    expect(shapeOf(after('prevl'))).toBe(TILED)
    expect(lastLog(after('previous-layout'))).toMatchObject({ name: 'previous-layout', detail: { layout: 'tiled' } })
  })

  it('cycle through every preset in order and wrap around', () => {
    const forward = [EVEN_H, EVEN_V, MAIN_H, MAIN_V, TILED, EVEN_H]
    let state = threePanes()
    for (const picture of forward) {
      state = after('nextl', state)
      expect(shapeOf(state)).toBe(picture)
    }
    for (const picture of [TILED, MAIN_V, MAIN_H, EVEN_V, EVEN_H, TILED]) {
      state = after('prevl', state)
      expect(shapeOf(state)).toBe(picture)
    }
  })

  it('work on the -t window', () => {
    const state = after('splitw -d -t server ; nextl -t server')
    expect(win(state, 'w2').layoutIndex).toBe(0)
    expect(win(state).layoutIndex).toBe(-1)
  })

  it('end the zoom', () => {
    const zoomed = updateWindow(threePanes(), 'w1', window => ({ ...window, zoomed: true }))
    expect(win(after('nextl', zoomed)).zoomed).toBe(false)
    expect(win(after('prevl', zoomed)).zoomed).toBe(false)
  })

  it('need a server', () => {
    for (const line of ['nextl', 'prevl', 'selectl tiled']) {
      expect(errorOf(run(emptyState(), line))).toEqual({ code: 'session.none' })
    }
  })
})
