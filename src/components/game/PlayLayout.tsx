import type { ComponentProps, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import type { useAnimationControls } from 'framer-motion'
import { cx } from '@/components/ui/cx'

interface PlayLayoutProps {
  header: ReactNode
  terminal: ReactNode
  aside: ReactNode
  asideLabel: string
  footer?: ReactNode
}

/** The play screen: dark bars top and bottom; terminal and side panel next to each other on wide screens, stacked on narrow ones. */
export function PlayLayout({ header, terminal, aside, asideLabel, footer }: PlayLayoutProps) {
  return (
    <div className="flex h-full flex-col bg-page">
      {header}
      <main className="min-h-0 flex-1 overflow-y-auto lg:overflow-hidden">
        <div className="flex flex-col gap-3 p-3 lg:h-full lg:flex-row">
          <div className="flex h-[65dvh] min-h-80 shrink-0 flex-col lg:h-auto lg:min-h-0 lg:flex-[3]">{terminal}</div>
          <aside aria-label={asideLabel} className="flex flex-col gap-3 lg:min-h-0 lg:flex-[2] lg:overflow-y-auto">
            {aside}
          </aside>
        </div>
      </main>
      {footer}
    </div>
  )
}

interface PlayBarProps extends ComponentProps<'header'> {
  as?: 'header' | 'footer'
}

/** A dark bar above or below the play area. Its items wrap onto a second line rather than overflow. */
export function PlayBar({ as: Tag = 'header', className, ...rest }: PlayBarProps) {
  return (
    <Tag
      {...rest}
      className={cx(
        'on-dark flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 bg-term-surface px-3 py-2 text-term-text shadow-card sm:px-4',
        Tag === 'header' ? 'border-b border-term-line' : 'border-t border-term-line',
        className,
      )}
    />
  )
}

interface BarChipProps {
  label: string
  value: ReactNode
  valueTestId?: string
}

/** A name and a number on a dark bar. */
export function BarChip({ label, value, valueTestId }: BarChipProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-pill border border-term-line-strong bg-term-raised px-3 py-1 text-xs text-term-muted">
      {label}
      <span data-testid={valueTestId} className="font-display text-sm font-bold text-term-text">{value}</span>
    </span>
  )
}

interface TerminalFrameProps {
  title: string
  children: ReactNode
  /** Drives the shake played when tmux refuses an input. */
  controls?: ReturnType<typeof useAnimationControls>
}

/** The window chrome around the simulated terminal. */
export function TerminalFrame({ title, children, controls }: TerminalFrameProps) {
  const { t } = useTranslation()
  return (
    <motion.section
      aria-label={t('game.terminalLabel')}
      animate={controls}
      className="on-dark flex min-h-0 flex-1 flex-col overflow-hidden rounded-card border border-term-line bg-term-bg shadow-raised"
    >
      <div className="flex shrink-0 items-center gap-3 border-b border-term-line bg-term-surface px-3 py-2">
        <span aria-hidden="true" className="flex gap-1.5">
          <span className="size-3 rounded-full bg-danger" />
          <span className="size-3 rounded-full bg-warning" />
          <span className="size-3 rounded-full bg-success" />
        </span>
        <span className="truncate font-mono text-xs text-term-muted">{title}</span>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </motion.section>
  )
}
