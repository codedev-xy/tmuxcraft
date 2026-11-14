import { clampRatio } from '@/core/layout-engine'
import type { Direction, LayoutNode } from '@/core/types'

/** `resize-pane` moves a border by 1% of its split per cell. */
const CELLS_PER_SPLIT = 100

export interface DragInput {
  readonly paneId: string
  readonly direction: Direction
  readonly cells: number
}

/** Whole cells a border moved when dragged `deltaPx` along a split `sizePx` long; negative is left / up. */
export function dragCells(deltaPx: number, sizePx: number): number {
  if (sizePx <= 0) return 0
  return Math.round((deltaPx / sizePx) * CELLS_PER_SPLIT) || 0
}

/** The split's ratio after its border moved by `cells`, kept inside the limits resize-pane uses. */
export function previewRatio(ratio: number, cells: number): number {
  return clampRatio(ratio + cells / CELLS_PER_SPLIT)
}

/**
 * The pane whose right (bottom) border is this split's divider: the last pane of the first child along
 * the split. resize-pane moves the nearest such border, so this pane moves exactly this divider.
 */
function paneBeforeDivider(node: LayoutNode, direction: LayoutNode['direction']): string | null {
  if (node.type === 'pane') return node.pane?.id ?? null
  if (!node.children) return null
  return paneBeforeDivider(node.children[node.direction === direction ? 1 : 0], direction)
}

/** The drag input that moves the divider of `split` by `cells`; null when there is nothing to move. */
export function dividerDrag(split: LayoutNode, cells: number): DragInput | null {
  if (cells === 0 || split.type !== 'split' || !split.children) return null
  const paneId = paneBeforeDivider(split.children[0], split.direction)
  if (paneId === null) return null
  const sideBySide = split.direction === 'vertical'
  const direction: Direction = cells > 0 ? (sideBySide ? 'right' : 'down') : (sideBySide ? 'left' : 'up')
  return { paneId, direction, cells: Math.abs(cells) }
}
