import { useEffect, useRef } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { displayKey } from '@/core/keymap'
import { formatError } from '@/i18n/format-error'
import type { CommandSource, TranscriptEntry } from '@/hooks/useTmuxSession'

function sourceLabel(t: TFunction, source: CommandSource): string {
  if (source.type === 'key') return source.keys.map(displayKey).join(' ')
  return t(source.type === 'click' ? 'terminal.mouseClick' : 'terminal.mouseDrag')
}

function LogLine({ entry }: { entry: TranscriptEntry }) {
  const { t } = useTranslation()
  switch (entry.kind) {
    case 'error':
      return <div data-kind="error" className="text-term-error">{formatError(t, entry.error)}</div>
    case 'output':
      return <div data-kind="output" className="whitespace-pre-wrap text-term-muted">{entry.text}</div>
    case 'command':
      return (
        <div data-kind="command">
          <span className="text-term-warning">{sourceLabel(t, entry.source)}</span>
          <span className="text-term-faint">{'  →  '}</span>
          <span className="text-term-cursor">{entry.command}</span>
        </div>
      )
    case 'input':
      return (
        <div data-kind="input">
          <span className="font-semibold text-term-prompt">$ </span>
          <span className="text-term-text">{entry.text}</span>
        </div>
      )
  }
}

/** The log under the terminal: typed lines, commands run by keys and the mouse, what tmux printed, and errors. */
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
      role="log"
      aria-label={t('terminal.log')}
      className="h-28 shrink-0 overflow-y-auto border-t border-term-line bg-term-bg px-2.5 py-2 font-mono text-xs leading-relaxed whitespace-pre-wrap"
    >
      {transcript.length === 0 && (
        <div className="flex h-full items-center justify-center tracking-wide text-term-muted">{t('game.outputPlaceholder')}</div>
      )}
      {transcript.map((entry, index) => <LogLine key={index} entry={entry} />)}
    </div>
  )
}
