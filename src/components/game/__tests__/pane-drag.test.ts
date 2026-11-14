import { describe, it, expect } from 'vitest'
import { getActiveWindow } from '@/core/selectors'
import { defaultState } from '@/core/state'
import type { LayoutNode, TmuxState } from '@/core/types'
import { applyInput, simulate } from '@/game/sim/simulate'
import { line } from '@/game/sim/inputs'
import { dividerDrag, dragCells, previewRatio } from '../pane-drag'

const after = (...lines: string[]): TmuxState =>
  simulate(defaultState(), [...lines, ':set -g mouse on'].map(line)).state

const tree = (state: TmuxState): LayoutNode => getActiveWindow(state)!.layoutTree

/** Drags the divider of the split at `path` (child indexes from the root) and returns the new tree. */
function dragDivider(state: TmuxState, path: readonly (0 | 1)[], cells: number): LayoutNode {
  const split = path.reduce((node, index) => node.children![index], tree(state))
  const input = dividerDrag(split, cells)
  if (!input) throw new Error('no drag')
  return tree(applyInput(state, { type: 'drag', ...input }).state)
}

describe('dragCells', () => {
  it('turns pixels into whole cells, one cell being 1% of the split', () => {
    expect(dragCells(50, 500)).toBe(10)
    expect(dragCells(-50, 500)).toBe(-10)
    expect(dragCells(7, 500)).toBe(1)
    expect(dragCells(2, 500)).toBe(0)
  })

  it('gives nothing when the split has no size', () => {
    expect(dragCells(40, 0)).toBe(0)
  })
})

describe('previewRatio', () => {
  it('moves the ratio by the cells and keeps it inside the limits', () => {
    expect(previewRatio(0.5, 10)).toBe(0.6)
    expect(previewRatio(0.5, -80)).toBe(0.1)
  })
})

describe('dividerDrag', () => {
  it('moves the divider of side-by-side panes right or left', () => {
    const state = after(':split-window -h')
    expect(dragDivider(state, [], 10).ratio).toBe(0.6)
    expect(dragDivider(state, [], -10).ratio).toBe(0.4)
  })

  it('moves the divider of stacked panes down or up', () => {
    const state = after(':split-window')
    expect(dragDivider(state, [], 10).ratio).toBe(0.6)
    expect(dragDivider(state, [], -20).ratio).toBe(0.3)
  })

  it('moves the outer divider when the left side is split again side by side', () => {
    const state = after(':split-window -h', ':select-pane -L', ':split-window -h')
    const moved = dragDivider(state, [], 10)
    expect(moved.ratio).toBe(0.6)
    expect(moved.children![0].ratio).toBe(tree(state).children![0].ratio)
  })

  it('moves an inner divider and leaves the outer one alone', () => {
    const state = after(':split-window -h', ':split-window')
    const moved = dragDivider(state, [1], 10)
    expect(moved.ratio).toBe(tree(state).ratio)
    expect(moved.children![1].ratio).toBe(0.6)
  })

  it('sends nothing for no movement', () => {
    expect(dividerDrag(tree(after(':split-window -h')), 0)).toBeNull()
  })
})
