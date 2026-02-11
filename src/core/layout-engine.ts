import type { LayoutNode, Pane, PaneLayout, Rect, PresetLayout } from './types'

let paneCounter = 100

export function generatePaneId(): string {
  return `pane-${++paneCounter}`
}

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

export function splitPane(tree: LayoutNode, paneId: string, direction: 'horizontal' | 'vertical'): { tree: LayoutNode; newPaneId: string } {
  const newPaneId = generatePaneId()
  const newPane: Pane = { id: newPaneId, content: [], cursorPosition: { row: 0, col: 0 }, isZoomed: false, cwd: '~' }
  const newTree = splitPaneInTree(tree, paneId, direction, newPane)
  return { tree: newTree, newPaneId }
}

function splitPaneInTree(node: LayoutNode, paneId: string, direction: 'horizontal' | 'vertical', newPane: Pane): LayoutNode {
  if (node.type === 'pane' && node.pane?.id === paneId) {
    return {
      type: 'split',
      direction,
      ratio: 0.5,
      children: [
        { type: 'pane', pane: { ...node.pane } },
        { type: 'pane', pane: newPane },
      ],
    }
  }
  if (node.type === 'split' && node.children) {
    return {
      ...node,
      children: [
        splitPaneInTree(node.children[0], paneId, direction, newPane),
        splitPaneInTree(node.children[1], paneId, direction, newPane),
      ],
    }
  }
  return node
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

export function resizePane(tree: LayoutNode, paneId: string, direction: 'left' | 'right' | 'up' | 'down', delta: number): LayoutNode {
  return resizePaneInTree(tree, paneId, direction, delta / 100)
}

function resizePaneInTree(node: LayoutNode, paneId: string, direction: string, delta: number): LayoutNode {
  if (node.type !== 'split' || !node.children) return node
  const [first, second] = node.children
  const firstContains = containsPane(first, paneId)
  const secondContains = containsPane(second, paneId)

  if (firstContains && secondContains) return node
  if (!firstContains && !secondContains) return node

  const isHorizontalResize = direction === 'left' || direction === 'right'
  const isVerticalResize = direction === 'up' || direction === 'down'
  const splitIsVertical = node.direction === 'vertical'
  const splitIsHorizontal = node.direction === 'horizontal'

  if ((isHorizontalResize && splitIsVertical) || (isVerticalResize && splitIsHorizontal)) {
    const currentRatio = node.ratio ?? 0.5
    let adjustment = delta
    if ((direction === 'left' && firstContains) || (direction === 'right' && secondContains) ||
        (direction === 'up' && firstContains) || (direction === 'down' && secondContains)) {
      adjustment = -delta
    }
    const newRatio = Math.max(0.1, Math.min(0.9, currentRatio + adjustment))
    return { ...node, ratio: newRatio }
  }

  return {
    ...node,
    children: [
      resizePaneInTree(first, paneId, direction, delta),
      resizePaneInTree(second, paneId, direction, delta),
    ],
  }
}

export function swapPanes(tree: LayoutNode, paneId1: string, paneId2: string): LayoutNode {
  const pane1 = findPaneData(tree, paneId1)
  const pane2 = findPaneData(tree, paneId2)
  if (!pane1 || !pane2) return tree
  let result = replacePaneData(tree, paneId1, pane2)
  result = replacePaneData(result, paneId2, pane1)
  return result
}

function findPaneData(tree: LayoutNode, paneId: string): Pane | null {
  if (tree.type === 'pane' && tree.pane?.id === paneId) return { ...tree.pane }
  if (tree.children) {
    for (const child of tree.children) {
      const found = findPaneData(child, paneId)
      if (found) return found
    }
  }
  return null
}

function replacePaneData(tree: LayoutNode, paneId: string, newPane: Pane): LayoutNode {
  if (tree.type === 'pane' && tree.pane?.id === paneId) {
    return { ...tree, pane: { ...newPane, id: paneId } }
  }
  if (tree.children) {
    return {
      ...tree,
      children: [
        replacePaneData(tree.children[0], paneId, newPane),
        replacePaneData(tree.children[1], paneId, newPane),
      ],
    }
  }
  return tree
}

export function applyPresetLayout(paneIds: string[], layoutType: PresetLayout): LayoutNode {
  const panes = paneIds.map(id => ({
    type: 'pane' as const,
    pane: { id, content: [], cursorPosition: { row: 0, col: 0 }, isZoomed: false, cwd: '~' },
  }))

  if (panes.length === 0) return { type: 'pane', pane: { id: 'empty', content: [], cursorPosition: { row: 0, col: 0 }, isZoomed: false, cwd: '~' } }
  if (panes.length === 1) return panes[0]

  switch (layoutType) {
    case 'even-horizontal':
      return buildEvenSplit(panes, 'horizontal')
    case 'even-vertical':
      return buildEvenSplit(panes, 'vertical')
    case 'main-horizontal': {
      if (panes.length === 1) return panes[0]
      const rest = panes.slice(1)
      return {
        type: 'split', direction: 'horizontal', ratio: 0.6,
        children: [panes[0], rest.length === 1 ? rest[0] : buildEvenSplit(rest, 'vertical')],
      }
    }
    case 'main-vertical': {
      if (panes.length === 1) return panes[0]
      const rest = panes.slice(1)
      return {
        type: 'split', direction: 'vertical', ratio: 0.6,
        children: [panes[0], rest.length === 1 ? rest[0] : buildEvenSplit(rest, 'horizontal')],
      }
    }
    case 'tiled':
      return buildTiled(panes)
    default:
      return buildEvenSplit(panes, 'horizontal')
  }
}

function buildEvenSplit(panes: LayoutNode[], direction: 'horizontal' | 'vertical'): LayoutNode {
  if (panes.length === 1) return panes[0]
  if (panes.length === 2) {
    return { type: 'split', direction, ratio: 0.5, children: [panes[0], panes[1]] }
  }
  const mid = Math.ceil(panes.length / 2)
  const ratio = mid / panes.length
  return {
    type: 'split', direction, ratio,
    children: [
      buildEvenSplit(panes.slice(0, mid), direction),
      buildEvenSplit(panes.slice(mid), direction),
    ],
  }
}

function buildTiled(panes: LayoutNode[]): LayoutNode {
  if (panes.length <= 2) return buildEvenSplit(panes, 'horizontal')
  const mid = Math.ceil(panes.length / 2)
  return {
    type: 'split', direction: 'horizontal', ratio: 0.5,
    children: [
      buildEvenSplit(panes.slice(0, mid), 'vertical'),
      buildEvenSplit(panes.slice(mid), 'vertical'),
    ],
  }
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
