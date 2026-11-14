import { motion } from 'framer-motion'
import { findPane } from '@/core/layout-engine'
import type { CopyModeState, LayoutNode, Pane, Position } from '@/core/types'

/** Copy mode as the pane draws it: where the cursor is and what is selected. */
export interface CopyView {
  readonly mode: CopyModeState
  readonly range: { readonly start: Position; readonly end: Position } | null
}

interface PaneRendererProps {
  tree: LayoutNode
  activePaneId?: string
  /** Draw only the active pane, filling the window. */
  zoomed?: boolean
  copy?: CopyView | null
  onPaneClick?: (paneId: string) => void
}

type Shared = Pick<PaneRendererProps, 'activePaneId' | 'copy' | 'onPaneClick'>

const CURSOR_CELL = { background: '#0ea5e9', color: '#0f172a' }
const SELECTED_CELL = { background: '#475569' }

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
  const ratio = node.ratio ?? 0.5
  return (
    <div className={`flex ${node.direction === 'vertical' ? 'flex-row' : 'flex-col'} h-full w-full gap-[2px]`}>
      <div style={{ flex: `${ratio} 1 0%` }} className="min-h-0 min-w-0">
        <PaneNode node={node.children[0]} {...shared} />
      </div>
      <div style={{ flex: `${1 - ratio} 1 0%` }} className="min-h-0 min-w-0">
        <PaneNode node={node.children[1]} {...shared} />
      </div>
    </div>
  )
}

/** The selected columns of a row, both ends included; null when the row has no selection. */
function selectedColumns(copy: CopyView, row: number, length: number): readonly [number, number] | null {
  const { range } = copy
  if (!range || row < range.start.row || row > range.end.row) return null
  return [row === range.start.row ? range.start.col : 0, row === range.end.row ? range.end.col : length]
}

function PaneLine({ text, row, copy }: { text: string; row: number; copy: CopyView | null }) {
  const cursor = copy && copy.mode.cursor.row === row ? copy.mode.cursor.col : null
  const selected = copy ? selectedColumns(copy, row, text.length) : null
  if (cursor === null && selected === null) return <div className="whitespace-pre">{text || ' '}</div>
  return (
    <div className="whitespace-pre">
      {Array.from(text || ' ').map((char, col) => {
        const isSelected = selected !== null && col >= selected[0] && col <= selected[1]
        return <span key={col} style={col === cursor ? CURSOR_CELL : isSelected ? SELECTED_CELL : undefined}>{char}</span>
      })}
    </div>
  )
}

function PaneView({ pane, active, copy, onClick }: { pane: Pane; active: boolean; copy: CopyView | null; onClick?: (paneId: string) => void }) {
  return (
    <motion.div
      data-pane-id={pane.id}
      data-active={active}
      onClick={onClick && (() => onClick(pane.id))}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="relative h-full w-full overflow-hidden font-[family-name:var(--font-mono)] text-xs"
      style={{
        padding: '8px',
        borderRadius: '8px',
        background: '#1e293b',
        border: active ? '2px solid #0ea5e9' : '1px solid #334155',
        boxShadow: active ? '0 0 0 2px rgba(14, 165, 233, 0.2)' : 'none',
      }}
    >
      <div
        className="absolute right-2 top-1 flex gap-2 font-[family-name:var(--font-pixel)]"
        style={{ fontSize: '10px', color: active ? 'rgba(14, 165, 233, 0.6)' : 'rgba(148, 163, 184, 0.4)' }}
      >
        {copy && <span style={{ color: '#f59e0b' }}>COPY</span>}
        <span>{pane.id}</span>
      </div>
      <div className="flex h-full flex-col justify-end overflow-hidden" style={{ color: '#e2e8f0' }}>
        {pane.content.map((line, row) => <PaneLine key={row} text={line} row={row} copy={copy} />)}
        {(active || pane.input !== '') && (
          <div className="whitespace-pre">
            <span style={{ color: '#0ea5e9' }}>$ </span>
            <span>{pane.input}</span>
            {active && !copy && (
              <span className="inline-block animate-[cursor-blink_1s_infinite] align-text-bottom" style={{ width: '8px', height: '14px', background: '#0ea5e9' }} />
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
