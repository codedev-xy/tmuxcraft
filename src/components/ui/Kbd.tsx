import type { ReactNode } from 'react'
import { cx } from './cx'

interface KbdProps {
  children: ReactNode
  /** Lets a long command break across lines instead of pushing its container wider. */
  wrap?: boolean
  onDark?: boolean
}

/** A key cap: something the player types or presses. */
export function Kbd({ children, wrap = false, onDark = false }: KbdProps) {
  return (
    <kbd
      className={cx(
        'rounded-md border px-1.5 py-0.5 font-mono text-[0.85em] leading-snug font-semibold',
        onDark ? 'border-term-line-strong bg-term-raised text-term-text' : 'border-accent-line bg-accent-faint text-accent-deep shadow-key',
        wrap ? 'box-decoration-clone break-words' : 'inline-block whitespace-nowrap',
      )}
    >
      {children}
    </kbd>
  )
}
