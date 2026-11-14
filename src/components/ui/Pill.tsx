import type { ReactNode } from 'react'
import { cx } from './cx'
import type { Tone } from './tone'

interface PillProps {
  children: ReactNode
  /** Left out, the pill follows the tone around it. */
  tone?: Tone
  /** Filled with the strong colour, for the few labels that must stand out. */
  solid?: boolean
  className?: string
}

/** A small rounded label: a level number, a state, a count. */
export function Pill({ children, tone, solid = false, className }: PillProps) {
  return (
    <span
      data-tone={tone}
      className={cx(
        'inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 text-xs font-bold whitespace-nowrap',
        solid ? 'bg-tone-strong text-white' : 'border border-tone-line bg-tone-soft text-tone-strong',
        className,
      )}
    >
      {children}
    </span>
  )
}
