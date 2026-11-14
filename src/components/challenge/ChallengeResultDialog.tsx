import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Confetti } from '@/components/ui/Confetti'
import { Dialog } from '@/components/ui/Dialog'
import { Stat } from '@/components/ui/Stat'

interface ChallengeResultDialogProps {
  open: boolean
  success: boolean
  goal: string
  seconds: number
  commandCount: number
  onRetry: () => void
  onBack: () => void
}

function ResultIcon({ success }: { success: boolean }) {
  return (
    <div aria-hidden="true" className="relative mb-2 flex justify-center">
      {success && (
        <span className="pointer-events-none absolute top-1/2 left-1/2">
          <Confetti count={18} />
        </span>
      )}
      <span className="text-5xl">{success ? '🎉' : '⏰'}</span>
    </div>
  )
}

/** The end of a challenge round, won or out of time. It is left through its buttons only. */
export function ChallengeResultDialog({ open, success, goal, seconds, commandCount, onRetry, onBack }: ChallengeResultDialogProps) {
  const { t } = useTranslation()
  return (
    <Dialog
      open={open}
      title={success ? t('challenge.completed') : t('challenge.timeUp')}
      centered
      width="sm"
      icon={<ResultIcon success={success} />}
    >
      <p className="mt-2 text-sm text-ink-muted">{goal}</p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <Stat label={t('challenge.yourTime')} value={t('challenge.secondsValue', { count: seconds })} tone={success ? 'accent' : 'danger'} />
        <Stat label={t('challenge.commandsUsed')} value={commandCount} tone="accent" />
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button variant={success ? 'success' : 'primary'} data-autofocus onClick={onRetry}>
          <span aria-hidden="true">↻</span>
          {t('challenge.tryAgain')}
        </Button>
        <Button onClick={onBack}>{t('challenge.backToMenu')}</Button>
      </div>
    </Dialog>
  )
}
