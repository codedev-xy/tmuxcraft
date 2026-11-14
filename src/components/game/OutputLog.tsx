import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { formatError } from '@/i18n/format-error'
import type { TranscriptEntry } from '@/hooks/useTmuxSession'

/** The log under the terminal: typed lines, what tmux printed, and errors in the player's language. */
export function OutputLog({ transcript }: { transcript: readonly TranscriptEntry[] }) {
  const { t } = useTranslation()
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const box = boxRef.current
    if (box) box.scrollTop = box.scrollHeight
  }, [transcript])

  return (
    <div
      ref={boxRef}
      className="h-28 shrink-0 overflow-y-auto font-[family-name:var(--font-mono)] text-xs leading-relaxed"
      style={{ padding: '8px 10px', background: '#0f172a', borderTop: '1px solid #334155' }}
    >
      {transcript.length === 0 && (
        <div className="flex h-full items-center justify-center" style={{ color: '#334155', letterSpacing: '0.05em' }}>
          {t('game.outputPlaceholder')}
        </div>
      )}
      {transcript.map((entry, index) => {
        if (entry.kind === 'error') return <div key={index} style={{ color: '#ef4444' }}>{formatError(t, entry.error)}</div>
        if (entry.kind === 'output') return <div key={index} className="whitespace-pre-wrap" style={{ color: '#94a3b8' }}>{entry.text}</div>
        return (
          <div key={index}>
            <span style={{ color: '#22c55e', fontWeight: 600 }}>$ </span>
            <span style={{ color: '#e2e8f0' }}>{entry.text}</span>
          </div>
        )
      })}
    </div>
  )
}
