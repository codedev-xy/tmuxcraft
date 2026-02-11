import { motion } from 'framer-motion'
import type { LayoutNode } from '@/core/types'

interface PaneRendererProps {
  tree: LayoutNode
  activePaneId?: string
  previewMode?: boolean
  className?: string
}

export function PaneRenderer({ tree, activePaneId, previewMode, className = '' }: PaneRendererProps) {
  return (
    <div className={`w-full h-full ${className}`}>
      <PaneNode node={tree} activePaneId={activePaneId} previewMode={previewMode} />
    </div>
  )
}

function PaneNode({ node, activePaneId, previewMode }: { node: LayoutNode; activePaneId?: string; previewMode?: boolean }) {
  if (node.type === 'pane' && node.pane) {
    const isActive = node.pane.id === activePaneId
    const isZoomed = node.pane.isZoomed

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className={`flex flex-col h-full w-full overflow-hidden ${isZoomed ? 'absolute inset-0 z-10' : 'relative'}`}
        style={{
          borderRadius: '8px',
          background: isActive && !previewMode
            ? '#1e293b'
            : previewMode
              ? 'rgba(30, 41, 59, 0.3)'
              : '#1e293b',
          border: isActive && !previewMode
            ? '2px solid #0ea5e9'
            : previewMode
              ? '1px solid rgba(51, 65, 85, 0.3)'
              : '1px solid #334155',
          boxShadow: isActive && !previewMode
            ? '0 0 0 2px rgba(14, 165, 233, 0.2)'
            : 'none',
        }}
      >
        <div className="flex-1 font-[family-name:var(--font-mono)] text-xs" style={{ padding: '8px' }}>
          <span
            className="font-[family-name:var(--font-pixel)]"
            style={{
              fontSize: '10px',
              color: isActive ? 'rgba(14, 165, 233, 0.6)' : 'rgba(148, 163, 184, 0.4)',
            }}
          >
            {node.pane.id}
          </span>
          {node.pane.content.length > 0 && (
            <div style={{ marginTop: '4px', color: '#e2e8f0' }}>
              {node.pane.content.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          )}
          {!previewMode && isActive && (
            <div style={{ marginTop: '4px' }}>
              <span style={{ color: '#0ea5e9' }}>$</span>
              <span
                className="inline-block animate-[cursor-blink_1s_infinite]"
                style={{
                  marginLeft: '4px',
                  width: '8px',
                  height: '16px',
                  background: '#0ea5e9',
                }}
              />
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  if (node.type === 'split' && node.children) {
    const ratio = node.ratio ?? 0.5
    const isVertical = node.direction === 'vertical'

    return (
      <div className={`flex ${isVertical ? 'flex-row' : 'flex-col'} h-full w-full gap-[2px]`}>
        <div style={{ flex: `${ratio} 1 0%` }} className="min-w-0 min-h-0">
          <PaneNode node={node.children[0]} activePaneId={activePaneId} previewMode={previewMode} />
        </div>
        <div style={{ flex: `${1 - ratio} 1 0%` }} className="min-w-0 min-h-0">
          <PaneNode node={node.children[1]} activePaneId={activePaneId} previewMode={previewMode} />
        </div>
      </div>
    )
  }

  return null
}
