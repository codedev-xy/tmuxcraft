import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { cx } from './cx'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const WIDTHS = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-xl' }

interface DialogProps {
  open: boolean
  title: string
  /** Called on Escape. Left out, the dialog can only be left through its own buttons. */
  onClose?: () => void
  /** Decoration above the title, such as a large emoji. */
  icon?: ReactNode
  centered?: boolean
  width?: keyof typeof WIDTHS
  children: ReactNode
}

function focusablesIn(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
}

/** Where Tab goes from `current`: round the dialog's controls, and back in from anywhere outside. */
function tabTarget(panel: HTMLElement, current: Element | null, backwards: boolean): HTMLElement {
  const controls = focusablesIn(panel)
  if (controls.length === 0) return panel
  const index = controls.indexOf(current as HTMLElement)
  if (index === -1) return backwards ? controls[controls.length - 1] : controls[0]
  return controls[(index + (backwards ? -1 : 1) + controls.length) % controls.length]
}

function DialogPanel({ title, onClose, icon, centered = false, width = 'md', children }: Omit<DialogProps, 'open'>) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const opener = document.activeElement
    const first = panel.querySelector<HTMLElement>('[data-autofocus]') ?? focusablesIn(panel)[0] ?? panel
    first.focus()
    return () => {
      if (opener instanceof HTMLElement) opener.focus()
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const panel = panelRef.current
      if (!panel) return
      if (event.key === 'Escape' && onClose) {
        event.preventDefault()
        event.stopPropagation()
        onClose()
      }
      if (event.key === 'Tab') {
        event.preventDefault()
        tabTarget(panel, document.activeElement, event.shiftKey).focus()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-scrim p-4 backdrop-blur-sm">
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        className={cx('relative my-auto w-full rounded-dialog bg-surface p-6 shadow-dialog outline-none sm:p-8', WIDTHS[width], centered && 'text-center')}
      >
        {icon}
        <h2 id={titleId} className="font-display text-2xl font-bold text-ink">{title}</h2>
        {children}
      </motion.div>
    </div>,
    document.body,
  )
}

/** A modal dialog: it takes the focus, keeps Tab inside, and gives the focus back when it closes. */
export function Dialog({ open, ...panel }: DialogProps) {
  return open ? <DialogPanel {...panel} /> : null
}
