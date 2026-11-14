import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { cx } from '@/components/ui/cx'
import type { TmuxState } from '@/core/types'
import type { TutorialStep } from '@/game/level-types'
import { renderHintText } from './hint-utils'

interface WalkthroughProps {
  steps: readonly TutorialStep[]
  state: TmuxState
}

type StepState = 'done' | 'current' | 'later'

const ROW: Record<StepState, string> = {
  done: 'border-line bg-surface-soft',
  current: 'border-accent-line bg-accent-faint',
  later: 'border-line bg-surface',
}

const MARK: Record<StepState, string> = {
  done: 'border-success-line bg-success-soft text-success-strong',
  current: 'border-accent-deep bg-accent-deep text-white',
  later: 'border-line bg-surface-soft text-ink-muted',
}

const TEXT: Record<StepState, string> = {
  done: 'text-ink-muted',
  current: 'text-ink',
  later: 'text-ink-soft',
}

/** The level's moves in order, ticked from the tmux state, with the next one to do pointed out. */
export function Walkthrough({ steps, state }: WalkthroughProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const done = steps.map(step => step.done(state))
  const current = done.indexOf(false)

  return (
    <Card className="p-4">
      <h2 id={titleId} className="font-display text-base font-bold text-ink">{t('game.walkthrough')}</h2>
      <ol aria-labelledby={titleId} className="mt-3 flex flex-col gap-2">
        {steps.map((step, index) => {
          const status: StepState = done[index] ? 'done' : index === current ? 'current' : 'later'
          return (
            <li
              key={step.messageKey}
              data-done={done[index]}
              aria-current={status === 'current' ? 'step' : undefined}
              className={cx('flex items-start gap-3 rounded-control border px-3 py-2.5 transition-colors duration-300', ROW[status])}
            >
              <span aria-hidden="true" className={cx('mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold', MARK[status])}>
                {done[index] ? '✓' : index + 1}
              </span>
              <span className={cx('text-sm leading-relaxed', TEXT[status])}>{renderHintText(t(step.messageKey))}</span>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
