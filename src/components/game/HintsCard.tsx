import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { getHint, getMaxHints } from '@/game/hint-system'
import type { LevelDefinition } from '@/game/level-types'
import { renderHintText } from './hint-utils'

interface HintsCardProps {
  level: LevelDefinition
  /** How many hints the player has asked for so far. */
  revealed: number
  onReveal: () => void
  disabled: boolean
}

/** Hints on request, one at a time; the first one costs the no-hints star. */
export function HintsCard({ level, revealed, onReveal, disabled }: HintsCardProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const left = Math.max(0, getMaxHints() - revealed)
  const shown = Array.from({ length: revealed }, (_, index) => getHint(level, (index + 1) as 1 | 2 | 3))

  return (
    <Card data-tone="warning" className="p-4" role="group" aria-labelledby={titleId}>
      <h2 id={titleId} className="flex items-center gap-2 font-display text-base font-bold text-ink">
        <span aria-hidden="true">💡</span>
        {t('game.hint')}
      </h2>
      <p className="mt-1 text-sm text-ink-muted">{revealed === 0 ? t('game.hintCost') : t('game.hintCostPaid')}</p>
      {shown.length > 0 && (
        <ol aria-label={t('game.hint')} className="mt-3 flex list-decimal flex-col gap-2 pl-5 marker:font-bold marker:text-tone-strong">
          {shown.map((key, index) => (
            <li key={index} className="rounded-control border border-tone-line bg-tone-soft px-3 py-2 text-sm leading-relaxed text-ink-soft">
              {renderHintText(t(key))}
            </li>
          ))}
        </ol>
      )}
      <Button variant="warning" size="sm" className="mt-3" disabled={disabled || left === 0} onClick={onReveal}>
        {t('game.showHint')}
        <span className="rounded-pill bg-white/25 px-2 py-0.5 text-xs">{t('game.hintsRemaining', { count: left })}</span>
      </Button>
    </Card>
  )
}
