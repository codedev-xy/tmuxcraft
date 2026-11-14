import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { cx } from '@/components/ui/cx'
import type { CopyModeState, Pane, Position } from '@/core/types'

/** Copy mode as the pane draws it: where the cursor is and what is selected. */
export interface CopyView {
  readonly mode: CopyModeState
  readonly range: { readonly start: Position; readonly end: Position } | null
}

interface PaneViewProps {
  pane: Pane
  active: boolean
  copy: CopyView | null
  onClick?: (paneId: string) => void
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
        const isCursor = col === cursor
        const isSelected = selected !== null && col >= selected[0] && col <= selected[1]
        return (
          <span
            key={col}
            data-cursor={isCursor ? 'copy' : undefined}
            data-selected={isSelected || undefined}
            className={cx(isSelected && 'bg-term-select text-term-text', isCursor && 'bg-term-warning text-term-bg')}
          >
            {char}
          </span>
        )
      })}
    </div>
  )
}

function PaneTags({ pane, active, copying }: { pane: Pane; active: boolean; copying: boolean }) {
  const { t } = useTranslation()
  return (
    <div className="absolute top-1 right-2 flex items-center gap-2 font-display text-[10px]">
      {copying && <span className="rounded-control bg-term-warning px-1.5 font-ui font-bold text-term-bg">{t('terminal.copyMode')}</span>}
      <span className={active ? 'text-term-muted' : 'text-term-faint'}>{pane.id}</span>
    </div>
  )
}

export function PaneView({ pane, active, copy, onClick }: PaneViewProps) {
  return (
    <motion.div
      data-pane-id={pane.id}
      data-active={active}
      onClick={onClick && (() => onClick(pane.id))}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={cx(
        'relative h-full w-full overflow-hidden rounded-control bg-term-surface p-2 font-mono text-xs',
        active ? 'border-2 border-term-cursor ring-2 ring-term-cursor/20' : 'border border-term-line',
      )}
    >
      <PaneTags pane={pane} active={active} copying={copy !== null} />
      <div className="flex h-full flex-col justify-end overflow-hidden text-term-text">
        {pane.content.map((line, row) => <PaneLine key={row} text={line} row={row} copy={copy} />)}
        {(active || pane.input !== '') && (
          <div className="whitespace-pre">
            <span className="text-term-prompt">$ </span>
            <span>{pane.input}</span>
            {active && !copy && (
              <span data-cursor="prompt" className="inline-block h-3.5 w-2 animate-blink bg-term-cursor align-text-bottom" />
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
