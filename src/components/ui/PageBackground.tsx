import type { ReactNode } from 'react'
import { cx } from './cx'

interface PageBackgroundProps {
  children: ReactNode
  /** Tints the page with a chapter's colours, for everything inside. */
  chapter?: number
  className?: string
}

/** A full-height page: the soft background with its two drifting blobs, and the page's parts stacked in a column. */
export function PageBackground({ children, chapter, className }: PageBackgroundProps) {
  return (
    <div data-chapter={chapter} className={cx('relative isolate flex h-full flex-col overflow-hidden bg-page', className)}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-[8%] -left-[6%] size-[35%] animate-drift rounded-full bg-chapter/15 blur-3xl" />
        <div className="absolute -right-[4%] -bottom-[5%] size-[30%] animate-drift rounded-full bg-accent-alt/10 blur-3xl [animation-direction:reverse]" />
        <div className="bg-dots absolute inset-0 opacity-30" />
      </div>
      {children}
    </div>
  )
}
