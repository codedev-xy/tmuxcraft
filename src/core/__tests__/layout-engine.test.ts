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
} from '../layout-engine'
import type { LayoutNode, Pane, Rect } from '../types'

function makePaneNode(id: string, content: string[] = []): LayoutNode {
  return { type: 'pane', pane: { id, content, cursorPosition: { row: 0, col: 0 }, isZoomed: false, cwd: '~' } }
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
  it('splits a single pane horizontally', () => {
    const tree = makePaneNode('p1')
    const { tree: newTree, newPaneId } = splitPane(tree, 'p1', 'horizontal')
    expect(newTree.type).toBe('split')
    expect(newTree.direction).toBe('horizontal')
    expect(newTree.ratio).toBe(0.5)
    expect(newTree.children).toHaveLength(2)
    expect(newTree.children![0].pane?.id).toBe('p1')
    expect(newTree.children![1].pane?.id).toBe(newPaneId)
    expect(newPaneId).toBeTruthy()
  })

  it('splits a single pane vertically', () => {
    const tree = makePaneNode('p1')
    const { tree: newTree, newPaneId } = splitPane(tree, 'p1', 'vertical')
    expect(newTree.type).toBe('split')
    expect(newTree.direction).toBe('vertical')
    expect(countPanes(newTree)).toBe(2)
  })

  it('splits a pane within a nested tree', () => {
    const tree = makeSplit('horizontal', makePaneNode('p1'), makePaneNode('p2'))
    const { tree: newTree } = splitPane(tree, 'p2', 'vertical')
    expect(countPanes(newTree)).toBe(3)
  })

  it('does not modify tree if pane not found', () => {
    const tree = makePaneNode('p1')
    const { tree: newTree } = splitPane(tree, 'nonexistent', 'horizontal')
    expect(countPanes(newTree)).toBe(1)
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

describe('resizePane', () => {
  it('adjusts ratio of vertical split when resizing right', () => {
    const tree = makeSplit('vertical', makePaneNode('p1'), makePaneNode('p2'))
    const resized = resizePane(tree, 'p1', 'right', 10)
    expect(resized.ratio).toBeGreaterThan(0.5)
  })

  it('adjusts ratio of horizontal split when resizing down', () => {
    const tree = makeSplit('horizontal', makePaneNode('p1'), makePaneNode('p2'))
    const resized = resizePane(tree, 'p1', 'down', 10)
    expect(resized.ratio).toBeGreaterThan(0.5)
  })

  it('clamps ratio to [0.1, 0.9]', () => {
    const tree = makeSplit('vertical', makePaneNode('p1'), makePaneNode('p2'), 0.9)
    const resized = resizePane(tree, 'p1', 'right', 50)
    expect(resized.ratio).toBeLessThanOrEqual(0.9)
    expect(resized.ratio).toBeGreaterThanOrEqual(0.1)
  })

  it('does not modify ratio when direction does not match split', () => {
    const tree = makeSplit('vertical', makePaneNode('p1'), makePaneNode('p2'))
    const resized = resizePane(tree, 'p1', 'down', 10)
    // vertical split cannot be resized by up/down at root level
    expect(resized.ratio).toBe(0.5)
  })
})

describe('swapPanes', () => {
  it('swaps content between two panes', () => {
    const tree = makeSplit('vertical',
      makePaneNode('p1'),
      makePaneNode('p2')
    )
    // Manually set content
    tree.children![0].pane!.content = ['Content A']
    tree.children![1].pane!.content = ['Content B']
    const swapped = swapPanes(tree, 'p1', 'p2')
    expect(swapped.children![0].pane!.content).toEqual(['Content B'])
    expect(swapped.children![1].pane!.content).toEqual(['Content A'])
  })

  it('preserves pane IDs after swap', () => {
    const tree = makeSplit('vertical', makePaneNode('p1'), makePaneNode('p2'))
    const swapped = swapPanes(tree, 'p1', 'p2')
    expect(swapped.children![0].pane!.id).toBe('p1')
    expect(swapped.children![1].pane!.id).toBe('p2')
  })

  it('returns unchanged tree if pane not found', () => {
    const tree = makeSplit('vertical', makePaneNode('p1'), makePaneNode('p2'))
    const result = swapPanes(tree, 'p1', 'nonexistent')
    expect(countPanes(result)).toBe(2)
  })
})

describe('applyPresetLayout', () => {
  it('returns single pane for one ID', () => {
    const tree = applyPresetLayout(['p1'], 'even-horizontal')
    expect(tree.type).toBe('pane')
    expect(tree.pane?.id).toBe('p1')
  })

  it('creates even-horizontal layout for 3 panes', () => {
    const tree = applyPresetLayout(['p1', 'p2', 'p3'], 'even-horizontal')
    expect(tree.type).toBe('split')
    expect(tree.direction).toBe('horizontal')
    expect(countPanes(tree)).toBe(3)
  })

  it('creates even-vertical layout for 3 panes', () => {
    const tree = applyPresetLayout(['p1', 'p2', 'p3'], 'even-vertical')
    expect(tree.direction).toBe('vertical')
    expect(countPanes(tree)).toBe(3)
  })

  it('creates main-horizontal layout', () => {
    const tree = applyPresetLayout(['p1', 'p2', 'p3'], 'main-horizontal')
    expect(tree.type).toBe('split')
    expect(tree.direction).toBe('horizontal')
    expect(tree.ratio).toBe(0.6)
  })

  it('creates main-vertical layout', () => {
    const tree = applyPresetLayout(['p1', 'p2', 'p3'], 'main-vertical')
    expect(tree.type).toBe('split')
    expect(tree.direction).toBe('vertical')
    expect(tree.ratio).toBe(0.6)
  })

  it('creates tiled layout', () => {
    const tree = applyPresetLayout(['p1', 'p2', 'p3', 'p4'], 'tiled')
    expect(tree.type).toBe('split')
    expect(countPanes(tree)).toBe(4)
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
