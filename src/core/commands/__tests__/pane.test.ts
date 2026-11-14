import { describe, it, expect } from 'vitest'
import { executeLine } from '../../execute'
import type { ShellRunner } from '../types'
import type { TmuxError } from '../../errors'
import { emptyState } from '../../state'
import type { LayoutNode, TmuxState, Window } from '../../types'
import { appendLog, appendPaneLines, updateWindow } from '../../update'
import { locateWindow, windowPanes } from '../../selectors'
import { errorOf, must, runLines, testEngine, TYPED } from '../../__tests__/harness'
import { twoSessionState } from '../../__tests__/fixtures'
import { PANE_COMMANDS } from '../pane'
import { LAYOUT_COMMANDS } from '../layout'

/** Echoes the line into the pane and logs it; `false` fails. */
const stubShell: ShellRunner = (state, paneId, line, ctx) => {
  const ran = appendLog(appendPaneLines(state, paneId, [`$ ${line}`]), { name: 'shell', origin: ctx.origin })
  const errors: TmuxError[] = line === 'false' ? [{ code: 'shell.commandNotFound', params: { command: 'false' } }] : []
  return { state: ran, ok: errors.length === 0, output: [], errors }
}

const ENGINE = testEngine([...PANE_COMMANDS, ...LAYOUT_COMMANDS], stubShell)

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    Object.values(value).forEach(deepFreeze)
  }
  return value
}

const run = (state: TmuxState, line: string) => executeLine(state, line, TYPED, ENGINE)
const after = (line: string, state: TmuxState = twoSessionState()) => must(run(state, line)).state
const win = (state: TmuxState, id: string): Window => {
  const found = locateWindow(state, id)
  if (!found) throw new Error(`no window ${id}`)
  return found.window
}
const order = (state: TmuxState, id: string) => windowPanes(win(state, id)).map(pane => pane.id)
const lastLog = (state: TmuxState) => state.log[state.log.length - 1]
const zoomed = (state: TmuxState, id = 'w1') => updateWindow(state, id, window => ({ ...window, zoomed: true }))

/** Compact picture of a tree: `(a|b)` side by side, `(a/b)` stacked, ratio after `@` when not 0.5. */
function shape(node: LayoutNode): string {
  if (node.pane) return node.pane.id
  const [first, second] = node.children!
  const ratio = node.ratio === 0.5 ? '' : `@${node.ratio}`
  return `(${shape(first)}${node.direction === 'vertical' ? '|' : '/'}${shape(second)})${ratio}`
}
const shapeOf = (state: TmuxState, id = 'w1') => shape(win(state, id).layoutTree)

describe('every pane command', () => {
  const LINES = [
    'splitw', 'killp', 'selectp -R', 'resizep -R', 'resizep -Z', 'swapp -D', 'breakp',
    'joinp -s %p3', 'lsp', 'selectl tiled', 'nextl', 'prevl',
  ]

  it('needs a server', () => {
    for (const line of LINES) expect(errorOf(run(emptyState(), line))).toEqual({ code: 'session.none' })
  })

  it('does not change the state it was given', () => {
    for (const line of LINES) {
      const state = deepFreeze(twoSessionState())
      const before = JSON.stringify(state)
      must(run(state, line))
      expect(JSON.stringify(state)).toBe(before)
    }
  })

  it('is logged under its canonical name', () => {
    const names = ['split-window', 'kill-pane', 'select-pane', 'resize-pane', 'resize-pane', 'swap-pane', 'break-pane',
      'join-pane', 'list-panes', 'select-layout', 'next-layout', 'previous-layout']
    LINES.forEach((line, i) => expect(lastLog(after(line)).name).toBe(names[i]))
  })
})

describe('split-window', () => {
  it('stacks a new pane below the active pane by default and makes it active', () => {
    const state = after('splitw')
    expect(shapeOf(state)).toBe('((p1/p5)|p2)')
    expect(win(state, 'w1').activePaneId).toBe('p5')
    expect(state.nextId).toBe(6)
    expect(lastLog(state).detail).toEqual({ direction: 'v', pane: 'p5' })
  })

  it('puts the new pane on the right with -h, and stacks with -v', () => {
    expect(shapeOf(after('split-window -h'))).toBe('((p1|p5)|p2)')
    expect(lastLog(after('splitw -h')).detail).toEqual({ direction: 'h', pane: 'p5' })
    expect(shapeOf(after('splitw -v'))).toBe('((p1/p5)|p2)')
  })

  it('creates an empty pane in the home directory', () => {
    const pane = windowPanes(win(after('splitw'), 'w1'))[1]
    expect(pane).toMatchObject({ id: 'p5', content: [], input: '', cwd: '~' })
  })

  it('keeps the active pane with -d', () => {
    const state = after('splitw -d')
    expect(shapeOf(state)).toBe('((p1/p5)|p2)')
    expect(win(state, 'w1').activePaneId).toBe('p1')
  })

  it('puts the new pane before the target with -b', () => {
    expect(shapeOf(after('splitw -b'))).toBe('((p5/p1)|p2)')
    expect(shapeOf(after('splitw -hb'))).toBe('((p5|p1)|p2)')
  })

  it('splits the -t pane, making the new pane active in that window only', () => {
    expect(shapeOf(after('splitw -t %p2'))).toBe('(p1|(p2/p5))')
    expect(shapeOf(after('splitw -t 1'))).toBe('(p1|(p2/p5))')
    const other = after('splitw -h -t server')
    expect(shapeOf(other, 'w2')).toBe('(p3|p5)')
    expect(win(other, 'w2').activePaneId).toBe('p5')
    expect(win(other, 'w1').activePaneId).toBe('p1')
    expect(other.sessions[0].activeWindowIndex).toBe(0)
  })

  it('gives the new pane -p percent of the space', () => {
    expect(shapeOf(after('splitw -p 30'))).toBe('((p1/p5)@0.7|p2)')
    expect(shapeOf(after('splitw -b -p 30'))).toBe('((p5/p1)@0.3|p2)')
  })

  it('gives the new pane -l cells, measured on the target pane of an 80x24 window', () => {
    expect(shapeOf(after('splitw -l 6'))).toBe('((p1/p5)@0.75|p2)')
    expect(shapeOf(after('splitw -h -l 10'))).toBe('((p1|p5)@0.75|p2)')
    expect(shapeOf(after('splitw -l 25%'))).toBe('((p1/p5)@0.75|p2)')
  })

  it('keeps the ratio within [0.1, 0.9]', () => {
    expect(shapeOf(after('splitw -p 5'))).toBe('((p1/p5)@0.9|p2)')
    expect(shapeOf(after('splitw -p 99'))).toBe('((p1/p5)@0.1|p2)')
    expect(shapeOf(after('splitw -h -l 70'))).toBe('((p1|p5)@0.1|p2)')
  })

  it('rejects a size that is not a number', () => {
    for (const [line, value] of [['splitw -p abc', 'abc'], ['splitw -l x', 'x'], ['splitw -l 5x%', '5x%'], ['splitw -p 10%', '10%']]) {
      expect(errorOf(run(twoSessionState(), line))).toEqual({ code: 'parse.badNumber', params: { value } })
    }
  })

  it('fails with pane.noSpace when a half would be under 2 cells', () => {
    const state = runLines(ENGINE, twoSessionState(), ['splitw -t server', 'splitw -t server', 'splitw -t server'])
    expect(windowPanes(win(state, 'w2')).length).toBe(4)
    expect(errorOf(run(state, 'splitw -t server'))).toEqual({ code: 'pane.noSpace' })
    const narrow = runLines(ENGINE, twoSessionState(), ['splitw -h -t server', 'splitw -h -t server', 'splitw -h -t server', 'splitw -h -t server', 'splitw -h -t server'])
    expect(errorOf(run(narrow, 'splitw -h -t server'))).toEqual({ code: 'pane.noSpace' })
  })

  it('runs trailing words as a shell line in the new pane', () => {
    const state = after('splitw -h tail -f app.log')
    expect(windowPanes(win(state, 'w1'))[1].content).toEqual(['$ tail -f app.log'])
    expect(state.log.map(entry => entry.name)).toEqual(['shell', 'split-window'])
  })

  it('passes the errors of that shell line through, keeping the split', () => {
    const result = run(twoSessionState(), 'splitw false')
    expect(result.ok).toBe(false)
    expect(result.errors).toEqual([{ code: 'shell.commandNotFound', params: { command: 'false' } }])
    expect(order(result.state, 'w1')).toEqual(['p1', 'p5', 'p2'])
    expect(lastLog(result.state).name).toBe('split-window')
  })

  it('ends the zoom of the window it splits', () => {
    expect(win(after('splitw', zoomed(twoSessionState())), 'w1').zoomed).toBe(false)
  })

  it('reports an unknown target', () => {
    expect(errorOf(run(twoSessionState(), 'splitw -t %p99'))).toEqual({ code: 'target.paneNotFound', params: { target: '%p99' } })
  })
})

describe('kill-pane', () => {
  it('kills the active pane and makes its neighbour active', () => {
    const state = after('killp')
    expect(shapeOf(state)).toBe('p2')
    expect(win(state, 'w1').activePaneId).toBe('p2')
    expect(lastLog(state).detail).toEqual({ pane: 'p1' })
  })

  it('kills the -t pane and keeps the active pane', () => {
    const state = after('kill-pane -t %p2')
    expect(shapeOf(state)).toBe('p1')
    expect(win(state, 'w1').activePaneId).toBe('p1')
  })

  it('removes the window with its last pane', () => {
    const state = after('killp -t server')
    expect(state.sessions[0].windows.map(window => window.id)).toEqual(['w1'])
  })

  it('kills every other pane of the window with -a', () => {
    const three = after('splitw -d -t %p2')
    const state = after('killp -a', three)
    expect(shapeOf(state)).toBe('p1')
    expect(win(state, 'w1').activePaneId).toBe('p1')
    const other = after('killp -a -t %p5', three)
    expect(shapeOf(other)).toBe('p5')
    expect(win(other, 'w1').activePaneId).toBe('p5')
    expect(order(other, 'w2')).toEqual(['p3'])
  })

  it('does nothing with -a on a window of one pane', () => {
    const state = after('killp -a -t server')
    expect(state.sessions).toEqual(twoSessionState().sessions)
  })

  it('ends the zoom', () => {
    const three = after('splitw -d -t %p2', zoomed(twoSessionState()))
    expect(win(after('killp -t %p5', zoomed(three)), 'w1').zoomed).toBe(false)
  })

  it('reports an unknown target', () => {
    expect(errorOf(run(twoSessionState(), 'killp -t 7'))).toEqual({ code: 'target.paneNotFound', params: { target: '7' } })
  })
})

describe('select-pane', () => {
  it('makes the -t pane active', () => {
    expect(win(after('selectp -t %p2'), 'w1').activePaneId).toBe('p2')
    expect(win(after('selectp -t 1'), 'w1').activePaneId).toBe('p2')
    expect(lastLog(after('selectp -t 1')).detail).toEqual({ pane: 'p2' })
  })

  it('moves to the pane in a direction', () => {
    expect(win(after('selectp -R'), 'w1').activePaneId).toBe('p2')
    expect(win(after('selectp -L -t %p2'), 'w1').activePaneId).toBe('p1')
    const stacked = after('splitw -d')
    expect(win(after('selectp -D', stacked), 'w1').activePaneId).toBe('p5')
    expect(win(after('selectp -U -t %p5', stacked), 'w1').activePaneId).toBe('p1')
  })

  it('does nothing when no pane lies that way', () => {
    for (const flag of ['-L', '-U', '-D']) {
      const state = after(`selectp ${flag}`)
      expect(state.sessions).toEqual(twoSessionState().sessions)
      expect(lastLog(state).name).toBe('select-pane')
    }
  })

  it('selects a pane of another window without changing the current window', () => {
    const state = after('splitw -d -t server ; selectp -t %p5')
    expect(win(state, 'w2').activePaneId).toBe('p5')
    expect(state.sessions[0].activeWindowIndex).toBe(0)
  })

  it('ends the zoom when the active pane changes, unless -Z', () => {
    expect(win(after('selectp -R', zoomed(twoSessionState())), 'w1').zoomed).toBe(false)
    const kept = after('selectp -R -Z', zoomed(twoSessionState()))
    expect(win(kept, 'w1')).toMatchObject({ zoomed: true, activePaneId: 'p2' })
    expect(win(after('selectp -t %p1', zoomed(twoSessionState())), 'w1').zoomed).toBe(true)
  })

  it('reports an unknown target', () => {
    expect(errorOf(run(twoSessionState(), 'selectp -t %p9'))).toEqual({ code: 'target.paneNotFound', params: { target: '%p9' } })
  })
})

describe('resize-pane', () => {
  it('moves a border one cell (1%) by default', () => {
    expect(shapeOf(after('resizep -R'))).toBe('(p1|p2)@0.51')
    expect(lastLog(after('resizep -R')).detail).toEqual({ pane: 'p1', direction: 'R', amount: '1' })
  })

  it('moves it by the given amount, growing the left pane with -R whichever pane is active', () => {
    expect(shapeOf(after('resize-pane -R 10'))).toBe('(p1|p2)@0.6')
    expect(shapeOf(after('resizep -t %p2 -R 10'))).toBe('(p1|p2)@0.6')
    expect(shapeOf(after('resizep -L 10'))).toBe('(p1|p2)@0.4')
    expect(shapeOf(after('resizep -t %p2 -L 10'))).toBe('(p1|p2)@0.4')
  })

  it('moves the bottom or top border with -D / -U', () => {
    const stacked = after('splitw -d')
    expect(shapeOf(after('resizep -D 5', stacked))).toBe('((p1/p5)@0.55|p2)')
    expect(shapeOf(after('resizep -U -t %p5 5', stacked))).toBe('((p1/p5)@0.45|p2)')
  })

  it('leaves the layout alone when no border runs that way', () => {
    expect(shapeOf(after('resizep -U 5'))).toBe('(p1|p2)')
  })

  it('rejects an amount that is not a number', () => {
    expect(errorOf(run(twoSessionState(), 'resizep -R abc'))).toEqual({ code: 'parse.badNumber', params: { value: 'abc' } })
    expect(errorOf(run(twoSessionState(), 'resizep -R 5 6'))).toEqual({ code: 'parse.tooManyArgs', params: { command: 'resize-pane' } })
  })

  it('ends the zoom', () => {
    expect(win(after('resizep -R', zoomed(twoSessionState())), 'w1').zoomed).toBe(false)
  })

  it('toggles the zoom of the window with -Z, making the target pane active', () => {
    const state = after('resizep -Z')
    expect(win(state, 'w1')).toMatchObject({ zoomed: true, activePaneId: 'p1' })
    expect(lastLog(state).detail).toEqual({ pane: 'p1', zoomed: 'true' })
    expect(win(after('resizep -Z', state), 'w1').zoomed).toBe(false)
    expect(win(after('resizep -Z -t %p2'), 'w1')).toMatchObject({ zoomed: true, activePaneId: 'p2' })
  })

  it('does not zoom a window of one pane', () => {
    expect(win(after('resizep -Z -t server'), 'w2').zoomed).toBe(false)
  })

  it('does nothing without a direction or -Z', () => {
    expect(after('resizep').sessions).toEqual(twoSessionState().sessions)
  })
})

describe('list-panes', () => {
  it('prints one line per pane of the current window', () => {
    expect(must(run(twoSessionState(), 'lsp')).output).toEqual(['0: [40x24] %p1 (active)', '1: [40x24] %p2'])
  })

  it('lists the -t window, rounding sizes to whole cells', () => {
    expect(must(run(twoSessionState(), 'list-panes -t server')).output).toEqual(['0: [80x24] %p3 (active)'])
    const three = after('selectl -t server even-horizontal', after('splitw -h -t server ; splitw -h -t server'))
    expect(must(run(three, 'lsp -t server')).output).toEqual(['0: [27x24] %p3', '1: [27x24] %p5', '2: [27x24] %p6 (active)'])
  })

  it('reports an unknown window', () => {
    expect(errorOf(run(twoSessionState(), 'lsp -t nope'))).toEqual({ code: 'target.windowNotFound', params: { target: 'nope' } })
  })
})
