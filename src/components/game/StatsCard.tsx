import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { Stat } from '@/components/ui/Stat'
import { efficientBudget } from '@/game/scoring'

interface StatsCardProps {
  commandCount: number
  optimalSteps: number
}

/** Commands used against the optimal count, and how many more still earn the efficient star. */
export function StatsCard({ commandCount, optimalSteps }: StatsCardProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const budget = efficientBudget(optimalSteps)
  const within = commandCount <= budget

  return (
    <Card className="p-4" role="group" aria-labelledby={titleId}>
      <h2 id={titleId} className="font-display text-base font-bold text-ink">{t('game.stats')}</h2>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label={t('game.commands')} value={commandCount} tone="accent" />
        <Stat label={t('game.optimal')} value={optimalSteps} tone="neutral" />
        <Stat
          label={t('game.efficientStar')}
          value={within ? t('game.budgetLeft', { count: budget - commandCount }) : t('game.budgetMissed')}
          tone={within ? 'success' : 'danger'}
        />
      </div>
      <p className="mt-2 text-xs text-ink-muted">{t('game.budgetNote', { count: budget })}</p>
    </Card>
  )
}
