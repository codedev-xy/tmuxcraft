import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Confetti } from '@/components/ui/Confetti'
import { Dialog } from '@/components/ui/Dialog'
import { StarRating } from '@/components/ui/StarRating'
import { Stat } from '@/components/ui/Stat'
import type { LevelDefinition, StarRating as Stars } from '@/game/level-types'
import { countStars } from '@/game/scoring'

const STAR_REASONS = ['completed', 'efficient', 'noHints'] as const

interface LevelCompleteDialogProps {
  open: boolean
  level: LevelDefinition
  stars: Stars
  commandCount: number
  hasNext: boolean
  onNext: () => void
  onRetry: () => void
  onBack: () => void
}

function Celebration({ perfect }: { perfect: boolean }) {
  return (
    <div aria-hidden="true" className="relative mb-2 flex justify-center">
      <span className="pointer-events-none absolute top-1/2 left-1/2">
        <Confetti count={perfect ? 24 : 12} />
      </span>
      <span className="animate-float text-5xl">🎉</span>
    </div>
  )
}

function StarReason({ reason, earned }: { reason: (typeof STAR_REASONS)[number]; earned: boolean }) {
  const { t } = useTranslation()
  return (
    <li data-tone={earned ? 'success' : 'neutral'} className="flex items-center gap-3 rounded-control border border-tone-line bg-tone-soft px-3 py-2">
      <span aria-hidden="true" className={earned ? 'text-star' : 'text-star-off'}>★</span>
      <span className="flex-1 text-sm font-semibold text-ink">{t(`game.stars.${reason}`)}</span>
      <span className="text-xs font-bold text-tone-strong">{earned ? t('game.starEarned') : t('game.starMissed')}</span>
    </li>
  )
}

/** Shown once the level is solved. It is left through its buttons only. */
export function LevelCompleteDialog({ open, level, stars, commandCount, hasNext, onNext, onRetry, onBack }: LevelCompleteDialogProps) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} title={t('game.levelComplete')} centered icon={<Celebration perfect={countStars(stars) === 3} />}>
      <StarRating stars={stars} size="lg" className="mt-3" />
      <ul className="mt-5 flex flex-col gap-2 text-left">
        {STAR_REASONS.map(reason => <StarReason key={reason} reason={reason} earned={stars[reason]} />)}
      </ul>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Stat label={t('game.commandsUsed')} value={commandCount} tone="accent" />
        <Stat label={t('game.optimal')} value={level.optimalSteps} tone="neutral" />
      </div>
      {!hasNext && <p className="mt-4 font-bold text-success-strong">{t('game.allLevelsComplete')}</p>}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {hasNext && (
          <Button variant="primary" data-autofocus onClick={onNext}>
            {t('game.nextLevel')}
            <span aria-hidden="true">→</span>
          </Button>
        )}
        <Button onClick={onRetry}>
          <span aria-hidden="true">↻</span>
          {t('game.retry')}
        </Button>
        <Button variant={hasNext ? 'ghost' : 'primary'} data-autofocus={hasNext ? undefined : true} onClick={onBack}>
          {t('game.backToLevels')}
        </Button>
      </div>
    </Dialog>
  )
}
