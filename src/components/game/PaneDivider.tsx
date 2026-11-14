import { useRef } from 'react'
import type { PointerEvent } from 'react'
import { cx } from '@/components/ui/cx'
import { dragCells } from './pane-drag'

interface PaneDividerProps {
  /** `vertical` sits between side-by-side panes and is dragged left / right. */
  orientation: 'vertical' | 'horizontal'
  /** Called with the cells moved so far while dragging; absent while the mouse is off. */
  onMove?: (cells: number) => void
  /** Called once when the drag ends, with the cells moved (0 when cancelled). */
  onDrop?: (cells: number) => void
}

interface Gesture {
  readonly pointerId: number
  readonly start: number
  readonly size: number
  readonly cells: number
}

/** The border between two panes; with the mouse on it can be dragged to resize them. */
export function PaneDivider({ orientation, onMove, onDrop }: PaneDividerProps) {
  const gesture = useRef<Gesture | null>(null)
  const vertical = orientation === 'vertical'
  const draggable = onMove !== undefined && onDrop !== undefined
  const along = (event: PointerEvent) => (vertical ? event.clientX : event.clientY)

  const start = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggable || event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    const box = event.currentTarget.parentElement?.getBoundingClientRect()
    const size = (vertical ? box?.width : box?.height) ?? 0
    gesture.current = { pointerId: event.pointerId, start: along(event), size, cells: 0 }
  }

  const move = (event: PointerEvent) => {
    const current = gesture.current
    if (!current || current.pointerId !== event.pointerId) return
    const cells = dragCells(along(event) - current.start, current.size)
    if (cells === current.cells) return
    gesture.current = { ...current, cells }
    onMove?.(cells)
  }

  const end = (event: PointerEvent, cancelled: boolean) => {
    const current = gesture.current
    if (!current || current.pointerId !== event.pointerId) return
    gesture.current = null
    onDrop?.(cancelled ? 0 : dragCells(along(event) - current.start, current.size))
  }

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={event => end(event, false)}
      onPointerCancel={event => end(event, true)}
      className={cx(
        'relative z-10 shrink-0 rounded-pill transition-colors',
        vertical ? 'w-1' : 'h-1',
        draggable && 'touch-none hover:bg-term-cursor/60 active:bg-term-cursor',
        draggable && (vertical ? 'cursor-col-resize' : 'cursor-row-resize'),
      )}
    >
      <span aria-hidden className={cx('absolute', vertical ? 'inset-y-0 -inset-x-1.5' : 'inset-x-0 -inset-y-1.5')} />
    </div>
  )
}
