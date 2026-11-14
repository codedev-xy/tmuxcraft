import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './Button'

interface ScreenHeaderProps {
  title: string
  subtitle?: string
  /** A decorative emoji before the title. */
  icon?: string
  /** Left out on a top-level page. */
  onBack?: () => void
  /** Controls on the right-hand side. */
  children?: ReactNode
}

export function ScreenHeader({ title, subtitle, icon, onBack, children }: ScreenHeaderProps) {
  const { t } = useTranslation()
  return (
    <header className="glass flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-3 shadow-card sm:px-6">
      {onBack && (
        <Button size="sm" onClick={onBack}>
          <span aria-hidden="true">←</span>
          {t('common.back')}
        </Button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-lg font-bold text-accent-deep">
          {icon && <span aria-hidden="true" className="mr-2">{icon}</span>}
          {title}
        </h1>
        {subtitle && <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>}
      </div>
      {children}
    </header>
  )
}
