import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { cx } from '@/components/ui/cx'

type CopyState = 'idle' | 'copied' | 'failed'

const FEEDBACK_MS = 1500

async function writeToClipboard(text: string): Promise<boolean> {
  if (!navigator.clipboard?.writeText) return false
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** Copies `text`, then says for a moment whether it worked. */
export function CopyButton({ text }: { text: string }) {
  const { t } = useTranslation()
  const [state, setState] = useState<CopyState>('idle')

  useEffect(() => {
    if (state === 'idle') return
    const timer = setTimeout(() => setState('idle'), FEEDBACK_MS)
    return () => clearTimeout(timer)
  }, [state])

  const copy = async () => setState(await writeToClipboard(text) ? 'copied' : 'failed')

  return (
    <span className="inline-flex items-center gap-1">
      <Button size="sm" variant="ghost" onClick={copy} aria-label={t('reference.copyLabel', { text })} className="px-2 py-0.5">
        {t('reference.copy')}
      </Button>
      <span role="status" className={cx('text-xs font-semibold', state === 'copied' ? 'text-success-strong' : 'text-danger-strong')}>
        {state === 'copied' && t('reference.copied')}
        {state === 'failed' && t('reference.copyFailed')}
      </span>
    </span>
  )
}
