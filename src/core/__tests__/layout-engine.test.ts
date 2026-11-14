import { describe, it, expect } from 'vitest'
import {
  calculateLayout,
  splitPane,
  closePane,
  resizePane,
  swapPanes,
  applyPresetLayout,
  compareLayouts,
  findPane,
  getAllPanes,
  countPanes,
  containsPane,
  getAdjacentPane,
  clampRatio,
  PRESET_LAYOUTS,
} from '../layout-engine'
import type { LayoutNode, Rect } from '../types'
import { createPane, paneNode } from '../state'

function makePaneNode(id: string, content: string[] = []): LayoutNode {
  return paneNode(id, content)
}

function makeSplit(dir: 'horizontal' | 'vertical', a: LayoutNode, b: LayoutNode, ratio = 0.5): LayoutNode {
  return { type: 'split', direction: dir, ratio, children: [a, b] }
}

const defaultBounds: Rect = { x: 0, y: 0, width: 100, height: 100 }

describe('calculateLayout', () => {
  it('returns single pane filling the bounds', () => {
    const tree = makePaneNode('p1')
    const layouts = calculateLayout(tree, defaultBounds)
    expect(layouts).toHaveLength(1)
    expect(layouts[0]).toEqual({ paneId: 'p1', x: 0, y: 0, width: 100, height: 100 })
  })

  it('calculates vertical split (side by side)', () => {
    const tree = makeSplit('vertical', makePaneNode('p1'), makePaneNode('p2'))
    const layouts = calculateLayout(tree, defaultBounds)
    expect(layouts).toHaveLength(2)
    expect(layouts[0]).toEqual({ paneId: 'p1', x: 0, y: 0, width: 50, height: 100 })
    expect(layouts[1]).toEqual({ paneId: 'p2', x: 50, y: 0, width: 50, height: 100 })
  })

  it('calculates horizontal split (top/bottom)', () => {
    const tree = makeSplit('horizontal', makePaneNode('p1'), makePaneNode('p2'))
    const layouts = calculateLayout(tree, defaultBounds)
    expect(layouts).toHaveLength(2)
    expect(layouts[0]).toEqual({ paneId: 'p1', x: 0, y: 0, width: 100, height: 50 })
    expect(layouts[1]).toEqual({ paneId: 'p2', x: 0, y: 50, width: 100, height: 50 })
  })

  it('respects custom ratio', () => {
    const tree = makeSplit('vertical', makePaneNode('p1'), makePaneNode('p2'), 0.7)
    const layouts = calculateLayout(tree, defaultBounds)
    expect(layouts[0].width).toBeCloseTo(70)
    expect(layouts[1].width).toBeCloseTo(30)
  })

  it('handles nested splits (2x2 grid)', () => {
    const tree = makeSplit('horizontal',
      makeSplit('vertical', makePaneNode('p1'), makePaneNode('p2')),
      makeSplit('vertical', makePaneNode('p3'), makePaneNode('p4'))
    )
    const layouts = calculateLayout(tree, defaultBounds)
    expect(layouts).toHaveLength(4)
    expect(layouts[0]).toEqual({ paneId: 'p1', x: 0, y: 0, width: 50, height: 50 })
    expect(layouts[1]).toEqual({ paneId: 'p2', x: 50, y: 0, width: 50, height: 50 })
    expect(layouts[2]).toEqual({ paneId: 'p3', x: 0, y: 50, width: 50, height: 50 })
    expect(layouts[3]).toEqual({ paneId: 'p4', x: 50, y: 50, width: 50, height: 50 })
  })

  it('returns empty array for node with no pane or children', () => {
    const tree: LayoutNode = { type: 'split' }
    const layouts = calculateLayout(tree, defaultBounds)
    expect(layouts).toEqual([])
  })
})

describe('splitPane', () => {
  it('puts the new pane after the target in a split of the given direction', () => {
    const tree = splitPane(makePaneNode('p1'), 'p1', 'horizontal', createPane('p2'))
    expect(tree.type).toBe('split')
    expect(tree.direction).toBe('horizontal')
    expect(tree.ratio).toBe(0.5)
    expect(tree.children![0].pane?.id).toBe('p1')
    expect(tree.children![1].pane?.id).toBe('p2')
  })

  it('splits side by side with a vertical split', () => {
    const tree = splitPane(makePaneNode('p1'), 'p1', 'vertical', createPane('p2'))
    expect(tree.direction).toBe('vertical')
    expect(countPanes(tree)).toBe(2)
  })

  it('keeps the target pane object and inserts the given pane object', () => {
    const original = makePaneNode('p1', ['hello'])
    const newPane = { ...createPane('p9', ['moved']), input: 'typed' }
    const tree = splitPane(original, 'p1', 'vertical', newPane)
    expect(tree.children![0].pane).toBe(original.pane)
    expect(tree.children![1].pane).toBe(newPane)
  })

  it('puts the new pane before the target with `before`', () => {
    const tree = splitPane(makePaneNode('p1'), 'p1', 'vertical', createPane('p2'), { before: true })
    expect(getAllPanes(tree).map(pane => pane.id)).toEqual(['p2', 'p1'])
  })

  it('gives the new pane `size` of the split, whichever side it is on', () => {
    expect(splitPane(makePaneNode('p1'), 'p1', 'vertical', createPane('p2'), { size: 0.3 }).ratio).toBeCloseTo(0.7)
    expect(splitPane(makePaneNode('p1'), 'p1', 'vertical', createPane('p2'), { size: 0.3, before: true }).ratio).toBeCloseTo(0.3)
  })

  it('splits a pane within a nested tree', () => {
    const tree = makeSplit('horizontal', makePaneNode('p1'), makePaneNode('p2'))
    const result = splitPane(tree, 'p2', 'vertical', createPane('p3'))
    expect(getAllPanes(result).map(pane => pane.id)).toEqual(['p1', 'p2', 'p3'])
    expect(result.children![1].direction).toBe('vertical')
  })

  it('does not modify tree if pane not found', () => {
    const tree = makePaneNode('p1')
    expect(splitPane(tree, 'nonexistent', 'horizontal', createPane('p2'))).toEqual(tree)
  })
})

describe('closePane', () => {
  it('returns null when closing the only pane', () => {
    const tree = makePaneNode('p1')
    expect(closePane(tree, 'p1')).toBeNull()
  })

  it('returns the sibling when closing one of two panes', () => {
    const tree = makeSplit('horizontal', makePaneNode('p1'), makePaneNode('p2'))
    const result = closePane(tree, 'p1')
    expect(result).not.toBeNull()
    expect(result!.type).toBe('pane')
    expect(result!.pane?.id).toBe('p2')
  })

  it('preserves other panes in nested tree', () => {
    const tree = makeSplit('horizontal',
      makePaneNode('p1'),
      makeSplit('vertical', makePaneNode('p2'), makePaneNode('p3'))
    )
    const result = closePane(tree, 'p2')
    expect(result).not.toBeNull()
    expect(countPanes(result!)).toBe(2)
    expect(containsPane(result!, 'p1')).toBe(true)
    expect(containsPane(result!, 'p3')).toBe(true)
  })

  it('does not modify tree if pane not found', () => {
    const tree = makeSplit('horizontal', makePaneNode('p1'), makePaneNode('p2'))
    const result = closePane(tree, 'nonexistent')
    expect(countPanes(result!)).toBe(2)
  })
})

/** ratio of the split at `path` (child indices from the root). */
function ratioAt(tree: LayoutNode, path: readonly number[]): number | undefined {
  return path.reduce((node, index) => node.children![index], tree).ratio
}

describe('resizePane', () => {
  const pair = (ratio = 0.5) => makeSplit('vertical', makePaneNode('a'), makePaneNode('b'), ratio)
  const stack = (ratio = 0.5) => makeSplit('horizontal', makePaneNode('a'), makePaneNode('b'), ratio)

  it('moves the right border of a pane that has one: -R grows the left pane, -L shrinks it', () => {
    expect(resizePane(pair(), 'a', 'right', 10).ratio).toBe(0.6)
    expect(resizePane(pair(), 'a', 'left', 10).ratio).toBe(0.4)
  })

  it('moves the left border of a pane with no right border, so -R still grows the left pane', () => {
    expect(resizePane(pair(), 'b', 'right', 10).ratio).toBe(0.6)
    expect(resizePane(pair(), 'b', 'left', 10).ratio).toBe(0.4)
  })

  it('moves the bottom border for -D / -U, or the top border when there is none', () => {
    expect(resizePane(stack(), 'a', 'down', 5).ratio).toBe(0.55)
    expect(resizePane(stack(), 'a', 'up', 5).ratio).toBe(0.45)
    expect(resizePane(stack(), 'b', 'down', 5).ratio).toBe(0.55)
    expect(resizePane(stack(), 'b', 'up', 5).ratio).toBe(0.45)
  })

  it('treats one cell as 1% of the split', () => {
    expect(resizePane(pair(), 'a', 'right', 1).ratio).toBe(0.51)
  })

  it('rounds the ratio so repeated steps do not accumulate float noise', () => {
    let tree = pair()
    for (let i = 0; i < 7; i++) tree = resizePane(tree, 'a', 'right', 1)
    expect(tree.ratio).toBe(0.57)
    for (let i = 0; i < 3; i++) tree = resizePane(tree, 'a', 'left', 1)
    expect(tree.ratio).toBe(0.54)
  })

  it('clamps the ratio to [0.1, 0.9]', () => {
    expect(resizePane(pair(0.85), 'a', 'right', 50).ratio).toBe(0.9)
    expect(resizePane(pair(0.15), 'a', 'left', 50).ratio).toBe(0.1)
  })

  it('leaves the tree unchanged when no split runs that way', () => {
    const tree = pair()
    expect(resizePane(tree, 'a', 'down', 10)).toEqual(tree)
    expect(resizePane(makePaneNode('a'), 'a', 'right', 10)).toEqual(makePaneNode('a'))
  })

  it('leaves the tree unchanged for an unknown pane', () => {
    const tree = pair()
    expect(resizePane(tree, 'zz', 'right', 10)).toEqual(tree)
  })

  describe('in ((a|b)|c)', () => {
    const tree = makeSplit('vertical', makeSplit('vertical', makePaneNode('a'), makePaneNode('b')), makePaneNode('c'), 0.6)

    it('a moves the inner border', () => {
      const result = resizePane(tree, 'a', 'right', 10)
      expect(ratioAt(result, [0])).toBe(0.6)
      expect(result.ratio).toBe(0.6)
    })

    it('b moves its right border, the outer one', () => {
      const result = resizePane(tree, 'b', 'right', 10)
      expect(result.ratio).toBe(0.7)
      expect(ratioAt(result, [0])).toBe(0.5)
    })

    it('c has no right border and moves its left border, the outer one', () => {
      const result = resizePane(tree, 'c', 'left', 10)
      expect(result.ratio).toBe(0.5)
      expect(ratioAt(result, [0])).toBe(0.5)
    })
  })

  describe('in (a|(b|c))', () => {
    const tree = makeSplit('vertical', makePaneNode('a'), makeSplit('vertical', makePaneNode('b'), makePaneNode('c')), 0.4)

    it('a moves the outer border', () => {
      expect(resizePane(tree, 'a', 'right', 10).ratio).toBe(0.5)
    })

    it('b moves its right border, the inner one', () => {
      const result = resizePane(tree, 'b', 'right', 10)
      expect(ratioAt(result, [1])).toBe(0.6)
      expect(result.ratio).toBe(0.4)
    })

    it('c moves its left border, the inner one', () => {
      const result = resizePane(tree, 'c', 'right', 10)
      expect(ratioAt(result, [1])).toBe(0.6)
      expect(result.ratio).toBe(0.4)
    })
  })

  it('skips splits of the other direction on the way up', () => {
    // (a / b) | c : resizing b right moves the outer vertical split
    const tree = makeSplit('vertical', makeSplit('horizontal', makePaneNode('a'), makePaneNode('b')), makePaneNode('c'))
    const result = resizePane(tree, 'b', 'right', 10)
    expect(result.ratio).toBe(0.6)
    expect(ratioAt(result, [0])).toBe(0.5)
  })

  it('does not mutate the input tree', () => {
    const tree = pair()
    const before = JSON.stringify(tree)
    resizePane(tree, 'a', 'right', 10)
    expect(JSON.stringify(tree)).toBe(before)
  })
})

describe('clampRatio', () => {
  it('clamps to [0.1, 0.9] and rounds to 3 decimals', () => {
    expect(clampRatio(0.05)).toBe(0.1)
    expect(clampRatio(0.95)).toBe(0.9)
    expect(clampRatio(0.1 + 0.2)).toBe(0.3)
    expect(clampRatio(2 / 3)).toBe(0.667)
  })
})

describe('swapPanes', () => {
  it('moves whole panes, IDs and content included', () => {
    const tree = makeSplit('vertical', makePaneNode('p1', ['A']), makePaneNode('p2', ['B']))
    const swapped = swapPanes(tree, 'p1', 'p2')
    expect(swapped.children![0].pane).toBe(tree.children![1].pane)
    expect(swapped.children![1].pane).toBe(tree.children![0].pane)
    expect(getAllPanes(swapped).map(pane => pane.id)).toEqual(['p2', 'p1'])
  })

  it('keeps the shape of the tree', () => {
    const tree = makeSplit('vertical', makePaneNode('p1'), makeSplit('horizontal', makePaneNode('p2'), makePaneNode('p3'), 0.3), 0.7)
    const swapped = swapPanes(tree, 'p1', 'p3')
    expect(getAllPanes(swapped).map(pane => pane.id)).toEqual(['p3', 'p2', 'p1'])
    expect(swapped.ratio).toBe(0.7)
    expect(swapped.children![1].ratio).toBe(0.3)
  })

  it('returns unchanged tree if pane not found', () => {
    const tree = makeSplit('vertical', makePaneNode('p1'), makePaneNode('p2'))
    expect(swapPanes(tree, 'p1', 'nonexistent')).toEqual(tree)
  })
})

describe('applyPresetLayout', () => {
  const panes = (count: number) => Array.from({ length: count }, (_, i) => ({ ...createPane(`p${i + 1}`, [`out ${i + 1}`]), input: `in ${i + 1}` }))
  const rects = (tree: LayoutNode) => calculateLayout(tree, defaultBounds).map(({ paneId, x, y, width, height }) =>
    ({ paneId, x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) }))

  it('lists the presets in tmux cycle order', () => {
    expect(PRESET_LAYOUTS).toEqual(['even-horizontal', 'even-vertical', 'main-horizontal', 'main-vertical', 'tiled'])
  })

  it('returns single pane for one pane', () => {
    const [only] = panes(1)
    const tree = applyPresetLayout([only], 'even-horizontal')
    expect(tree).toEqual({ type: 'pane', pane: only })
  })

  it('keeps the pane objects, so content and input survive', () => {
    const input = panes(4)
    for (const layout of PRESET_LAYOUTS) {
      const result = getAllPanes(applyPresetLayout(input, layout))
      expect(result).toHaveLength(4)
      input.forEach(pane => expect(result).toContain(pane))
    }
  })

  it('even-horizontal spreads panes left to right with equal widths', () => {
    const tree = applyPresetLayout(panes(3), 'even-horizontal')
    expect(tree.direction).toBe('vertical')
    expect(rects(tree)).toEqual([
      { paneId: 'p1', x: 0, y: 0, width: 33, height: 100 },
      { paneId: 'p2', x: 33, y: 0, width: 33, height: 100 },
      { paneId: 'p3', x: 67, y: 0, width: 33, height: 100 },
    ])
  })

  it('even-vertical stacks panes with equal heights', () => {
    const tree = applyPresetLayout(panes(4), 'even-vertical')
    expect(tree.direction).toBe('horizontal')
    expect(rects(tree).map(rect => [rect.paneId, rect.y, rect.height, rect.width])).toEqual([
      ['p1', 0, 25, 100], ['p2', 25, 25, 100], ['p3', 50, 25, 100], ['p4', 75, 25, 100],
    ])
  })

  it('main-horizontal puts the first pane on top at 0.6 and the rest side by side below', () => {
    const tree = applyPresetLayout(panes(3), 'main-horizontal')
    expect(tree.direction).toBe('horizontal')
    expect(tree.ratio).toBe(0.6)
    expect(rects(tree)).toEqual([
      { paneId: 'p1', x: 0, y: 0, width: 100, height: 60 },
      { paneId: 'p2', x: 0, y: 60, width: 50, height: 40 },
      { paneId: 'p3', x: 50, y: 60, width: 50, height: 40 },
    ])
  })

  it('main-vertical puts the first pane on the left at 0.6 and stacks the rest', () => {
    const tree = applyPresetLayout(panes(3), 'main-vertical')
    expect(tree.direction).toBe('vertical')
    expect(tree.ratio).toBe(0.6)
    expect(rects(tree)).toEqual([
      { paneId: 'p1', x: 0, y: 0, width: 60, height: 100 },
      { paneId: 'p2', x: 60, y: 0, width: 40, height: 50 },
      { paneId: 'p3', x: 60, y: 50, width: 40, height: 50 },
    ])
  })

  it('tiled stacks two panes, as tmux does', () => {
    expect(rects(applyPresetLayout(panes(2), 'tiled'))).toEqual([
      { paneId: 'p1', x: 0, y: 0, width: 100, height: 50 },
      { paneId: 'p2', x: 0, y: 50, width: 100, height: 50 },
    ])
  })

  it('tiled makes a 2x2 grid of four panes, filling rows left to right', () => {
    expect(rects(applyPresetLayout(panes(4), 'tiled'))).toEqual([
      { paneId: 'p1', x: 0, y: 0, width: 50, height: 50 },
      { paneId: 'p2', x: 50, y: 0, width: 50, height: 50 },
      { paneId: 'p3', x: 0, y: 50, width: 50, height: 50 },
      { paneId: 'p4', x: 50, y: 50, width: 50, height: 50 },
    ])
  })

  it('tiled gives a short last row the full width', () => {
    expect(rects(applyPresetLayout(panes(3), 'tiled'))).toEqual([
      { paneId: 'p1', x: 0, y: 0, width: 50, height: 50 },
      { paneId: 'p2', x: 50, y: 0, width: 50, height: 50 },
      { paneId: 'p3', x: 0, y: 50, width: 100, height: 50 },
    ])
  })

  it('tiled uses 3 rows of 2 for five panes and 3 rows of 3 for seven', () => {
    const five = rects(applyPresetLayout(panes(5), 'tiled'))
    expect(five.map(rect => [rect.y, rect.height, rect.width])).toEqual([
      [0, 33, 50], [0, 33, 50], [33, 33, 50], [33, 33, 50], [67, 33, 100],
    ])
    const seven = rects(applyPresetLayout(panes(7), 'tiled'))
    expect(seven.map(rect => [rect.x, rect.y, rect.width])).toEqual([
      [0, 0, 33], [33, 0, 33], [67, 0, 33], [0, 33, 33], [33, 33, 33], [67, 33, 33], [0, 67, 100],
    ])
  })

  it('handles empty pane list', () => {
    const tree = applyPresetLayout([], 'even-horizontal')
    expect(tree.type).toBe('pane')
    expect(tree.pane?.id).toBe('empty')
  })
})

describe('compareLayouts', () => {
  it('returns 1 for identical structures', () => {
    const a = makeSplit('horizontal', makePaneNode('p1'), makePaneNode('p2'))
    const b = makeSplit('horizontal', makePaneNode('p3'), makePaneNode('p4'))
    expect(compareLayouts(a, b)).toBe(1)
  })

  it('returns less than 1 for different directions', () => {
    const a = makeSplit('horizontal', makePaneNode('p1'), makePaneNode('p2'))
    const b = makeSplit('vertical', makePaneNode('p3'), makePaneNode('p4'))
    expect(compareLayouts(a, b)).toBeLessThan(1)
  })

  it('returns less than 1 for different pane counts', () => {
    const a = makePaneNode('p1')
    const b = makeSplit('horizontal', makePaneNode('p2'), makePaneNode('p3'))
    expect(compareLayouts(a, b)).toBeLessThan(1)
  })
})

describe('findPane', () => {
  it('finds pane in single-pane tree', () => {
    const tree = makePaneNode('p1')
    const found = findPane(tree, 'p1')
    expect(found).not.toBeNull()
    expect(found!.pane?.id).toBe('p1')
  })

  it('finds pane in nested tree', () => {
    const tree = makeSplit('horizontal',
      makePaneNode('p1'),
      makeSplit('vertical', makePaneNode('p2'), makePaneNode('p3'))
    )
    const found = findPane(tree, 'p3')
    expect(found).not.toBeNull()
    expect(found!.pane?.id).toBe('p3')
  })

  it('returns null for non-existent pane', () => {
    const tree = makePaneNode('p1')
    expect(findPane(tree, 'nonexistent')).toBeNull()
  })
})

describe('getAllPanes', () => {
  it('returns single pane', () => {
    const panes = getAllPanes(makePaneNode('p1'))
    expect(panes).toHaveLength(1)
    expect(panes[0].id).toBe('p1')
  })

  it('returns all panes in order', () => {
    const tree = makeSplit('horizontal',
      makePaneNode('p1'),
      makeSplit('vertical', makePaneNode('p2'), makePaneNode('p3'))
    )
    const panes = getAllPanes(tree)
    expect(panes.map(p => p.id)).toEqual(['p1', 'p2', 'p3'])
  })
})

describe('countPanes', () => {
  it('counts 1 for single pane', () => {
    expect(countPanes(makePaneNode('p1'))).toBe(1)
  })

  it('counts 4 for 2x2 grid', () => {
    const tree = makeSplit('horizontal',
      makeSplit('vertical', makePaneNode('p1'), makePaneNode('p2')),
      makeSplit('vertical', makePaneNode('p3'), makePaneNode('p4'))
    )
    expect(countPanes(tree)).toBe(4)
  })
})

describe('containsPane', () => {
  it('returns true for existing pane', () => {
    const tree = makeSplit('horizontal', makePaneNode('p1'), makePaneNode('p2'))
    expect(containsPane(tree, 'p1')).toBe(true)
  })

  it('returns false for non-existent pane', () => {
    expect(containsPane(makePaneNode('p1'), 'p2')).toBe(false)
  })
})

describe('getAdjacentPane', () => {
  it('finds pane to the right', () => {
    const tree = makeSplit('vertical', makePaneNode('p1'), makePaneNode('p2'))
    expect(getAdjacentPane(tree, 'p1', 'right')).toBe('p2')
  })

  it('finds pane to the left', () => {
    const tree = makeSplit('vertical', makePaneNode('p1'), makePaneNode('p2'))
    expect(getAdjacentPane(tree, 'p2', 'left')).toBe('p1')
  })

  it('finds pane below', () => {
    const tree = makeSplit('horizontal', makePaneNode('p1'), makePaneNode('p2'))
    expect(getAdjacentPane(tree, 'p1', 'down')).toBe('p2')
  })

  it('finds pane above', () => {
    const tree = makeSplit('horizontal', makePaneNode('p1'), makePaneNode('p2'))
    expect(getAdjacentPane(tree, 'p2', 'up')).toBe('p1')
  })

  it('returns null when no adjacent pane exists', () => {
    const tree = makeSplit('vertical', makePaneNode('p1'), makePaneNode('p2'))
    expect(getAdjacentPane(tree, 'p1', 'up')).toBeNull()
  })

  it('navigates in 2x2 grid', () => {
    const tree = makeSplit('horizontal',
      makeSplit('vertical', makePaneNode('p1'), makePaneNode('p2')),
      makeSplit('vertical', makePaneNode('p3'), makePaneNode('p4'))
    )
    expect(getAdjacentPane(tree, 'p1', 'right')).toBe('p2')
    expect(getAdjacentPane(tree, 'p1', 'down')).toBe('p3')
    expect(getAdjacentPane(tree, 'p4', 'left')).toBe('p3')
    expect(getAdjacentPane(tree, 'p4', 'up')).toBe('p2')
  })
})
