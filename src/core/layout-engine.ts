import type { LayoutNode, Pane, PaneLayout, Rect, PresetLayout } from './types'
import { createPane } from './state'

export function calculateLayout(tree: LayoutNode, bounds: Rect): PaneLayout[] {
  if (tree.type === 'pane' && tree.pane) {
    return [{ paneId: tree.pane.id, x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }]
  }
  if (tree.type === 'split' && tree.children) {
    const ratio = tree.ratio ?? 0.5
    const [first, second] = tree.children
    if (tree.direction === 'vertical') {
      const firstWidth = bounds.width * ratio
      const secondWidth = bounds.width * (1 - ratio)
      return [
        ...calculateLayout(first, { x: bounds.x, y: bounds.y, width: firstWidth, height: bounds.height }),
        ...calculateLayout(second, { x: bounds.x + firstWidth, y: bounds.y, width: secondWidth, height: bounds.height }),
      ]
    } else {
      const firstHeight = bounds.height * ratio
      const secondHeight = bounds.height * (1 - ratio)
      return [
        ...calculateLayout(first, { x: bounds.x, y: bounds.y, width: bounds.width, height: firstHeight }),
        ...calculateLayout(second, { x: bounds.x, y: bounds.y + firstHeight, width: bounds.width, height: secondHeight }),
      ]
    }
  }
  return []
}

export type SplitDirection = 'horizontal' | 'vertical'
export type ResizeDirection = 'left' | 'right' | 'up' | 'down'

/** Preset layouts in the order `next-layout` cycles through them. */
export const PRESET_LAYOUTS: readonly PresetLayout[] = ['even-horizontal', 'even-vertical', 'main-horizontal', 'main-vertical', 'tiled']

const MIN_RATIO = 0.1
const MAX_RATIO = 0.9

/** Keeps a split ratio in [0.1, 0.9], rounded to 3 decimals so repeated steps do not drift. */
export function clampRatio(ratio: number): number {
  return Math.round(Math.max(MIN_RATIO, Math.min(MAX_RATIO, ratio)) * 1000) / 1000
}

export interface SplitOptions {
  /** Put the new pane before (left of / above) the target instead of after it. */
  readonly before?: boolean
  /** The new pane's share of the split, kept in [0.1, 0.9]; 0.5 when absent. */
  readonly size?: number
}

/** Splits the leaf holding `paneId` in two, keeping that pane and adding `newPane` beside it. */
export function splitPane(tree: LayoutNode, paneId: string, direction: SplitDirection, newPane: Pane, options: SplitOptions = {}): LayoutNode {
  const size = options.size ?? 0.5
  return mapLeaves(tree, leaf => {
    if (leaf.pane?.id !== paneId) return leaf
    const added: LayoutNode = { type: 'pane', pane: newPane }
    const children: [LayoutNode, LayoutNode] = options.before ? [added, leaf] : [leaf, added]
    return { type: 'split', direction, ratio: clampRatio(options.before ? size : 1 - size), children }
  })
}

function mapLeaves(node: LayoutNode, change: (leaf: LayoutNode) => LayoutNode): LayoutNode {
  if (node.type === 'pane') return change(node)
  if (!node.children) return node
  return { ...node, children: [mapLeaves(node.children[0], change), mapLeaves(node.children[1], change)] }
}

export function closePane(tree: LayoutNode, paneId: string): LayoutNode | null {
  if (tree.type === 'pane') {
    return tree.pane?.id === paneId ? null : tree
  }
  if (tree.type === 'split' && tree.children) {
    const [first, second] = tree.children
    const newFirst = closePane(first, paneId)
    const newSecond = closePane(second, paneId)
    if (newFirst === null && newSecond === null) return null
    if (newFirst === null) return newSecond
    if (newSecond === null) return newFirst
    return { ...tree, children: [newFirst, newSecond] }
  }
  return tree
}

/** A split on the way from the root to a pane, and which of its children holds the pane. */
interface PathStep {
  readonly node: LayoutNode
  readonly index: 0 | 1
}

function pathTo(node: LayoutNode, paneId: string): PathStep[] | null {
  if (node.type === 'pane') return node.pane?.id === paneId ? [] : null
  if (!node.children) return null
  for (const index of [0, 1] as const) {
    const rest = pathTo(node.children[index], paneId)
    if (rest) return [{ node, index }, ...rest]
  }
  return null
}

function updateAt(node: LayoutNode, path: readonly (0 | 1)[], change: (node: LayoutNode) => LayoutNode): LayoutNode {
  if (path.length === 0 || !node.children) return change(node)
  const [index, ...rest] = path
  const children: [LayoutNode, LayoutNode] = [...node.children]
  children[index] = updateAt(children[index], rest, change)
  return { ...node, children }
}

/**
 * Resizes like tmux: left / right move the pane's right border if it has one, otherwise its left border,
 * and up / down do the same with its bottom / top border. One cell is 1% of the split being moved.
 */
export function resizePane(tree: LayoutNode, paneId: string, direction: ResizeDirection, cells: number): LayoutNode {
  const path = pathTo(tree, paneId)
  if (!path) return tree
  const splitDirection: SplitDirection = direction === 'left' || direction === 'right' ? 'vertical' : 'horizontal'
  const depths = path.map((_, depth) => depth).reverse()
  const nearest = (index: 0 | 1) => depths.find(depth => path[depth].node.direction === splitDirection && path[depth].index === index)
  const depth = nearest(0) ?? nearest(1)
  if (depth === undefined) return tree
  const delta = (direction === 'right' || direction === 'down' ? cells : -cells) / 100
  const route = path.slice(0, depth).map(step => step.index)
  return updateAt(tree, route, node => ({ ...node, ratio: clampRatio((node.ratio ?? 0.5) + delta) }))
}

/** Exchanges two panes of a tree, moving the whole `Pane` objects. */
export function swapPanes(tree: LayoutNode, paneId1: string, paneId2: string): LayoutNode {
  const pane1 = findPane(tree, paneId1)?.pane
  const pane2 = findPane(tree, paneId2)?.pane
  if (!pane1 || !pane2) return tree
  return mapLeaves(tree, leaf => {
    if (leaf.pane?.id === paneId1) return { ...leaf, pane: pane2 }
    if (leaf.pane?.id === paneId2) return { ...leaf, pane: pane1 }
    return leaf
  })
}

/** Rebuilds a window's tree in a preset layout; the first pane is the main pane. Pane objects are kept as they are. */
export function applyPresetLayout(panes: readonly Pane[], layoutType: PresetLayout): LayoutNode {
  const leaves: LayoutNode[] = panes.map(pane => ({ type: 'pane', pane }))
  if (leaves.length === 0) return { type: 'pane', pane: createPane('empty') }
  if (leaves.length === 1) return leaves[0]
  const [main, ...rest] = leaves
  switch (layoutType) {
    case 'even-horizontal':
      return buildEvenSplit(leaves, 'vertical')
    case 'even-vertical':
      return buildEvenSplit(leaves, 'horizontal')
    case 'main-horizontal':
      return { type: 'split', direction: 'horizontal', ratio: 0.6, children: [main, buildEvenSplit(rest, 'vertical')] }
    case 'main-vertical':
      return { type: 'split', direction: 'vertical', ratio: 0.6, children: [main, buildEvenSplit(rest, 'horizontal')] }
    case 'tiled':
      return buildTiled(leaves)
  }
}

/** Splits nodes into equal shares along one direction. */
function buildEvenSplit(nodes: readonly LayoutNode[], direction: SplitDirection): LayoutNode {
  if (nodes.length === 1) return nodes[0]
  const mid = Math.ceil(nodes.length / 2)
  return {
    type: 'split', direction, ratio: mid / nodes.length,
    children: [buildEvenSplit(nodes.slice(0, mid), direction), buildEvenSplit(nodes.slice(mid), direction)],
  }
}

/** tmux's tiled grid: grow rows, then columns, until the panes fit; rows fill left to right. */
function buildTiled(leaves: readonly LayoutNode[]): LayoutNode {
  let rows = 1
  let cols = 1
  while (rows * cols < leaves.length) {
    rows++
    if (rows * cols < leaves.length) cols++
  }
  const rowNodes: LayoutNode[] = []
  for (let start = 0; start < leaves.length; start += cols) {
    rowNodes.push(buildEvenSplit(leaves.slice(start, start + cols), 'vertical'))
  }
  return buildEvenSplit(rowNodes, 'horizontal')
}

export function compareLayouts(actual: LayoutNode, target: LayoutNode): number {
  const actualPanes = getAllPanes(actual)
  const targetPanes = getAllPanes(target)
  if (actualPanes.length !== targetPanes.length) {
    return Math.min(actualPanes.length, targetPanes.length) / Math.max(actualPanes.length, targetPanes.length) * 0.5
  }
  const structureScore = compareStructure(actual, target)
  return structureScore
}

function compareStructure(a: LayoutNode, b: LayoutNode): number {
  if (a.type === 'pane' && b.type === 'pane') return 1
  if (a.type !== b.type) return 0.3
  if (a.type === 'split' && b.type === 'split') {
    if (a.direction !== b.direction) return 0.3
    if (!a.children || !b.children) return 0.5
    const childScore = (compareStructure(a.children[0], b.children[0]) + compareStructure(a.children[1], b.children[1])) / 2
    const ratioA = a.ratio ?? 0.5
    const ratioB = b.ratio ?? 0.5
    const ratioDiff = Math.abs(ratioA - ratioB)
    const ratioScore = Math.max(0, 1 - ratioDiff * 2)
    return childScore * 0.7 + ratioScore * 0.3
  }
  return 0
}

export function findPane(tree: LayoutNode, paneId: string): LayoutNode | null {
  if (tree.type === 'pane' && tree.pane?.id === paneId) return tree
  if (tree.children) {
    for (const child of tree.children) {
      const found = findPane(child, paneId)
      if (found) return found
    }
  }
  return null
}

export function getAllPanes(tree: LayoutNode): Pane[] {
  if (tree.type === 'pane' && tree.pane) return [tree.pane]
  if (tree.children) {
    return [...getAllPanes(tree.children[0]), ...getAllPanes(tree.children[1])]
  }
  return []
}

export function countPanes(tree: LayoutNode): number {
  return getAllPanes(tree).length
}

export function containsPane(tree: LayoutNode, paneId: string): boolean {
  return findPane(tree, paneId) !== null
}

export function getAdjacentPane(tree: LayoutNode, paneId: string, direction: 'up' | 'down' | 'left' | 'right'): string | null {
  const bounds: Rect = { x: 0, y: 0, width: 100, height: 100 }
  const layouts = calculateLayout(tree, bounds)
  const current = layouts.find(l => l.paneId === paneId)
  if (!current) return null

  const cx = current.x + current.width / 2
  const cy = current.y + current.height / 2

  let candidates = layouts.filter(l => l.paneId !== paneId)

  switch (direction) {
    case 'left':
      candidates = candidates.filter(l => l.x + l.width <= current.x + 1)
      break
    case 'right':
      candidates = candidates.filter(l => l.x >= current.x + current.width - 1)
      break
    case 'up':
      candidates = candidates.filter(l => l.y + l.height <= current.y + 1)
      break
    case 'down':
      candidates = candidates.filter(l => l.y >= current.y + current.height - 1)
      break
  }

  if (candidates.length === 0) return null

  let best = candidates[0]
  let bestDist = Infinity
  for (const c of candidates) {
    const ccx = c.x + c.width / 2
    const ccy = c.y + c.height / 2
    const dist = Math.abs(ccx - cx) + Math.abs(ccy - cy)
    if (dist < bestDist) {
      bestDist = dist
      best = c
    }
  }
  return best.paneId
}
