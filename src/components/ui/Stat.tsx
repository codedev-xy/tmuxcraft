import type { ReactNode } from 'react'
import { cx } from './cx'
import type { Tone } from './tone'

interface StatProps {
  label: string
  value: ReactNode
  tone?: Tone
  className?: string
}

/** One number with its name, as shown in the stats rows. */
export function Stat({ label, value, tone, className }: StatProps) {
  return (
    <div data-tone={tone} className={cx('rounded-control border border-line bg-surface px-3 py-2 text-center', className)}>
      <div className="font-display text-lg leading-tight font-bold text-tone-strong">{value}</div>
      <div className="mt-0.5 text-[11px] font-semibold tracking-wide text-ink-muted uppercase">{label}</div>
    </div>
  )
}
