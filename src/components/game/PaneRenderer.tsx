import { useState } from 'react'
import { findPane } from '@/core/layout-engine'
import type { LayoutNode } from '@/core/types'
import { PaneDivider } from './PaneDivider'
import { PaneView } from './PaneView'
import type { CopyView } from './PaneView'
import { dividerDrag, previewRatio } from './pane-drag'
import type { DragInput } from './pane-drag'

export type { CopyView } from './PaneView'

interface PaneRendererProps {
  tree: LayoutNode
  activePaneId?: string
  /** Draw only the active pane, filling the window. */
  zoomed?: boolean
  copy?: CopyView | null
  onPaneClick?: (paneId: string) => void
  /** Makes the dividers draggable; called once per drag that moved a border. */
  onDrag?: (drag: DragInput) => void
}

type Shared = Pick<PaneRendererProps, 'activePaneId' | 'copy' | 'onPaneClick' | 'onDrag'>

export function PaneRenderer({ tree, zoomed = false, ...shared }: PaneRendererProps) {
  const shown = zoomed && shared.activePaneId ? findPane(tree, shared.activePaneId) ?? tree : tree
  return (
    <div className="h-full w-full">
      <PaneNode node={shown} {...shared} />
    </div>
  )
}

function PaneNode({ node, ...shared }: { node: LayoutNode } & Shared) {
  if (node.type === 'pane' && node.pane) {
    const { pane } = node
    const copy = shared.copy?.mode.paneId === pane.id ? shared.copy : null
    return <PaneView pane={pane} active={pane.id === shared.activePaneId} copy={copy} onClick={shared.onPaneClick} />
  }
  if (node.type !== 'split' || !node.children) return null
  return <SplitView node={node} parts={node.children} {...shared} />
}

interface SplitViewProps extends Shared {
  node: LayoutNode
  parts: readonly [LayoutNode, LayoutNode]
}

/** Two panes (or splits) side by side or stacked; the divider follows a drag before it is sent. */
function SplitView({ node, parts, ...shared }: SplitViewProps) {
  const [preview, setPreview] = useState<number | null>(null)
  const { onDrag } = shared
  const ratio = preview ?? node.ratio ?? 0.5
  const sideBySide = node.direction === 'vertical'

  const drop = (cells: number) => {
    setPreview(null)
    const drag = dividerDrag(node, cells)
    if (drag) onDrag?.(drag)
  }

  return (
    <div className={`flex h-full w-full ${sideBySide ? 'flex-row' : 'flex-col'}`}>
      <div style={{ flex: `${ratio} 1 0%` }} className="min-h-0 min-w-0">
        <PaneNode node={parts[0]} {...shared} />
      </div>
      <PaneDivider
        orientation={sideBySide ? 'vertical' : 'horizontal'}
        onMove={onDrag && (cells => setPreview(previewRatio(node.ratio ?? 0.5, cells)))}
        onDrop={onDrag && drop}
      />
      <div style={{ flex: `${1 - ratio} 1 0%` }} className="min-h-0 min-w-0">
        <PaneNode node={parts[1]} {...shared} />
      </div>
    </div>
  )
}
