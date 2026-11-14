import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'
import { ProgressBar } from '@/components/ui/ProgressBar'
import type { TmuxState } from '@/core/types'
import type { LevelDefinition, LevelObjective, ValidationResult } from '@/game/level-types'
import { HintsCard } from './HintsCard'
import { StatsCard } from './StatsCard'
import { Walkthrough } from './Walkthrough'
import { renderHintText } from './hint-utils'
import { shownObjectives } from './play-utils'

interface ObjectivesPanelProps {
  currentLevel: LevelDefinition
  state: TmuxState
  validation: ValidationResult
  commandCount: number
  hintsUsed: number
  onRevealHint: () => void
  isComplete: boolean
}

function ObjectiveItem({ objective, index, done }: { objective: LevelObjective; index: number; done: boolean }) {
  const { t } = useTranslation()
  return (
    <motion.li
      data-done={done}
      data-tone={done ? 'success' : 'neutral'}
      animate={done ? { scale: [1, 1.02, 1] } : { scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex items-start gap-3 rounded-control border border-tone-line bg-tone-soft px-3 py-2.5 transition-colors duration-300"
    >
      <span aria-hidden="true" className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-tone-line bg-surface text-xs font-bold text-tone-strong">
        {done ? '✓' : index + 1}
      </span>
      <span className="min-w-0 flex-1 text-sm leading-relaxed text-ink-soft">{renderHintText(t(objective.descriptionKey))}</span>
      {done ? <Pill>{t('game.objectiveDone')}</Pill> : <span className="sr-only">{t('game.objectiveTodo')}</span>}
    </motion.li>
  )
}

function ObjectivesCard({ level, done }: { level: LevelDefinition; done: readonly string[] }) {
  const { t } = useTranslation()
  const titleId = useId()
  const total = level.objectives.length
  const allDone = total > 0 && done.length === total
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id={titleId} className="font-display text-base font-bold text-ink">{t('game.taskObjectives')}</h2>
        <Pill tone={allDone ? 'success' : 'accent'}>{done.length}/{total}</Pill>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{renderHintText(t(level.descriptionKey))}</p>
      <ProgressBar
        className="mt-3"
        value={total > 0 ? done.length / total : 0}
        label={t('game.objectivesDone', { done: done.length, total })}
        tone={allDone ? 'success' : 'accent'}
      />
      <ol aria-labelledby={titleId} className="mt-3 flex flex-col gap-2">
        {level.objectives.map((objective, index) => (
          <ObjectiveItem key={objective.id} objective={objective} index={index} done={done.includes(objective.id)} />
        ))}
      </ol>
    </Card>
  )
}

/** The side panel: what to do, the walk-through, hints on request, and the numbers so far. */
export function ObjectivesPanel({ currentLevel, state, validation, commandCount, hintsUsed, onRevealHint, isComplete }: ObjectivesPanelProps) {
  const steps = currentLevel.tutorialSteps
  return (
    <>
      <ObjectivesCard level={currentLevel} done={shownObjectives(validation, commandCount)} />
      {steps && steps.length > 0 && <Walkthrough steps={steps} state={state} />}
      <HintsCard level={currentLevel} revealed={hintsUsed} onReveal={onRevealHint} disabled={isComplete} />
      <StatsCard commandCount={commandCount} optimalSteps={currentLevel.optimalSteps} />
    </>
  )
}
