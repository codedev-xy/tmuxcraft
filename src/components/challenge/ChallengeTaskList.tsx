import { useTranslation } from 'react-i18next'
import { cx } from '@/components/ui/cx'
import type { ChallengeTask } from '@/game/level-types'

interface ChallengeTaskListProps {
  tasks: readonly ChallengeTask[]
  /** The ids of the tasks that hold right now. */
  done: readonly string[]
  className?: string
}

/** The tasks of a challenge goal, each marked as done or still to do. */
export function ChallengeTaskList({ tasks, done, className }: ChallengeTaskListProps) {
  const { t } = useTranslation()
  return (
    <ol className={cx('flex flex-col gap-2 text-left', className)}>
      {tasks.map((task, index) => {
        const isDone = done.includes(task.id)
        return (
          <li
            key={task.id}
            data-done={isDone}
            data-tone={isDone ? 'success' : 'neutral'}
            className="flex items-start gap-3 rounded-control border border-tone-line bg-tone-soft px-3 py-2.5 transition-colors duration-300"
          >
            <span aria-hidden="true" className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-tone-line bg-surface text-xs font-bold text-tone-strong">
              {isDone ? '✓' : index + 1}
            </span>
            <span className="min-w-0 flex-1 text-sm leading-relaxed text-ink-soft">{t(task.key, task.params)}</span>
            <span className="sr-only">{t(isDone ? 'game.objectiveDone' : 'game.objectiveTodo')}</span>
          </li>
        )
      })}
    </ol>
  )
}
