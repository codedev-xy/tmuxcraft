import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import type { Tone } from '@/components/ui/tone'
import type { TmuxError } from '@/core/errors'
import { formatError } from '@/i18n/format-error'
import { PlayBar } from './PlayLayout'

interface GameFooterProps {
  comboCount: number
  error: TmuxError | null
  onRetry: () => void
  onOpenReference: () => void
}

function comboTone(count: number): Tone {
  if (count >= 10) return 'danger'
  if (count >= 4) return 'warning'
  return 'accent'
}

function ComboBadge({ count }: { count: number }) {
  const { t } = useTranslation()
  return (
    <AnimatePresence>
      {count > 1 && (
        <motion.span
          key="combo"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [1, 1.1, 1], opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Pill tone={comboTone(count)}>{t('game.combo')} ×{count}</Pill>
        </motion.span>
      )}
    </AnimatePresence>
  )
}

export function GameFooter({ comboCount, error, onRetry, onOpenReference }: GameFooterProps) {
  const { t } = useTranslation()
  return (
    <PlayBar as="footer">
      <Button variant="dark" size="sm" onClick={onRetry}>
        <span aria-hidden="true">↻</span>
        {t('game.retry')}
      </Button>
      <Button variant="dark" size="sm" onClick={onOpenReference}>
        <span aria-hidden="true">📖</span>
        {t('game.quickReference')}
      </Button>
      <ComboBadge count={comboCount} />
      <div aria-live="polite" className="min-w-0 flex-1 basis-48 text-right">
        {error && <span className="text-sm font-semibold text-term-error">{formatError(t, error)}</span>}
      </div>
    </PlayBar>
  )
}
