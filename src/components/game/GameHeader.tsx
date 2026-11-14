import { useTranslation } from 'react-i18next'
import { IconButton } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { cx } from '@/components/ui/cx'
import type { LevelDefinition } from '@/game/level-types'
import { BarChip, PlayBar } from './PlayLayout'

interface GameHeaderProps {
  level: LevelDefinition
  objectivesDone: number
  commandCount: number
  onBack: () => void
}

function ObjectiveDots({ done, total }: { done: number; total: number }) {
  const { t } = useTranslation()
  return (
    <span role="img" aria-label={t('game.objectivesDone', { done, total })} className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={cx('size-2.5 rounded-full transition-colors duration-300', index < done ? 'bg-term-prompt' : 'bg-term-line-strong')}
        />
      ))}
    </span>
  )
}

export function GameHeader({ level, objectivesDone, commandCount, onBack }: GameHeaderProps) {
  const { t } = useTranslation()
  return (
    <PlayBar data-chapter={level.chapter}>
      <IconButton label={t('game.backToLevels')} variant="dark-ghost" size="sm" onClick={onBack}>
        <span aria-hidden="true">←</span>
      </IconButton>
      <Pill tone="chapter" solid>{t('game.levelNumber', { id: level.id })}</Pill>
      <h1 className="min-w-0 flex-1 basis-40 font-display text-base font-bold text-term-text sm:text-lg">{t(level.titleKey)}</h1>
      <ObjectiveDots done={objectivesDone} total={level.objectives.length} />
      <BarChip label={t('game.commands')} value={commandCount} />
    </PlayBar>
  )
}
