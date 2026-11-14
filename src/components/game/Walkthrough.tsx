import { useTranslation } from 'react-i18next'
import type { TmuxState } from '@/core/types'
import type { TutorialStep } from '@/game/level-types'
import { renderHintText } from './hint-utils'

interface WalkthroughProps {
  steps: readonly TutorialStep[]
  state: TmuxState
}

const MARK = 'shrink-0 w-6 h-6 mt-0.5 rounded-full flex items-center justify-center text-xs font-semibold border'

/** The level's moves in order, ticked from the tmux state, with the next one to do pointed out. */
export function Walkthrough({ steps, state }: WalkthroughProps) {
  const { t } = useTranslation()
  const done = steps.map(step => step.done(state))
  const current = done.indexOf(false)

  return (
    <div className="px-5 pt-5">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-1.5 h-5 rounded-full bg-violet-400" />
        <span className="font-[family-name:var(--font-pixel)] text-xs tracking-widest text-slate-400 uppercase">{t('game.walkthrough')}</span>
        <div className="flex-1 h-px bg-slate-100" />
      </div>
      <ol aria-label={t('game.walkthrough')} className="flex flex-col gap-2">
        {steps.map((step, index) => {
          const isDone = done[index]
          const isCurrent = index === current
          const row = isCurrent ? 'bg-violet-50 border-violet-300' : isDone ? 'bg-white/60 border-slate-200' : 'bg-white/85 border-slate-200'
          const mark = isDone ? 'bg-green-100 border-green-300 text-green-700' : isCurrent ? 'bg-violet-500 border-violet-500 text-white' : 'bg-slate-50 border-slate-200 text-slate-400'
          const text = isDone ? 'text-slate-400' : isCurrent ? 'text-slate-800' : 'text-slate-500'
          return (
            <li
              key={step.messageKey}
              data-done={isDone}
              aria-current={isCurrent ? 'step' : undefined}
              className={`flex items-start gap-3 rounded-xl border-[1.5px] px-3.5 py-2.5 transition-colors duration-300 ${row}`}
            >
              <span aria-hidden="true" className={`${MARK} ${mark}`}>{isDone ? '✓' : index + 1}</span>
              <span className={`font-[family-name:var(--font-ui)] text-sm leading-relaxed ${text}`}>{renderHintText(t(step.messageKey))}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
