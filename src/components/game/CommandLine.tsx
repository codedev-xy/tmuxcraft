import { useRef, useState } from 'react'
import type { KeyboardEvent, RefObject } from 'react'
import { useTranslation } from 'react-i18next'

interface CommandLineProps {
  inputRef: RefObject<HTMLInputElement | null>
  disabled: boolean
  prefixPending: boolean
  onSubmit: (line: string) => void
}

/** The command box under the terminal, with Up / Down recalling earlier lines. */
export function CommandLine({ inputRef, disabled, prefixPending, onSubmit }: CommandLineProps) {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const history = useRef<readonly string[]>([])
  /** Index into `history` of the recalled line; -1 while typing a new one. */
  const recalled = useRef(-1)

  const recall = (index: number) => {
    recalled.current = index
    setInput(index < 0 ? '' : history.current[index])
  }

  const submit = () => {
    const line = input.trim()
    if (line === '') return
    history.current = [...history.current, line]
    recall(-1)
    onSubmit(line)
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    const lines = history.current.length
    if (event.key === 'Enter') submit()
    else if (event.key === 'ArrowUp' && lines > 0) recall(recalled.current < 0 ? lines - 1 : Math.max(0, recalled.current - 1))
    else if (event.key === 'ArrowDown' && recalled.current >= 0) recall(recalled.current + 1 < lines ? recalled.current + 1 : -1)
    else return
    event.preventDefault()
  }

  return (
    <div
      className="flex shrink-0 items-center font-[family-name:var(--font-mono)] text-sm"
      style={{ padding: '10px 12px', background: 'linear-gradient(180deg, #1e293b, #172033)', borderTop: '1px solid #334155' }}
    >
      {prefixPending && (
        <span
          className="animate-pulse font-[family-name:var(--font-pixel)] text-xs"
          style={{
            marginRight: '8px',
            padding: '2px 8px',
            borderRadius: '6px',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            background: 'rgba(245, 158, 11, 0.15)',
            color: '#f59e0b',
          }}
        >
          PREFIX
        </span>
      )}
      <span className="font-bold" style={{ marginRight: '6px', color: '#22c55e' }}>$</span>
      <input
        ref={inputRef}
        type="text"
        aria-label={t('game.commandBox')}
        value={input}
        onChange={event => setInput(event.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 bg-transparent outline-none"
        style={{ color: '#e2e8f0', caretColor: '#22c55e' }}
        placeholder={prefixPending ? t('game.prefixActive') : t('game.commandPlaceholder')}
        disabled={disabled}
      />
    </div>
  )
}
