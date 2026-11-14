import { useRef, useState } from 'react'
import type { KeyboardEvent, RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { displayKey } from '@/core/keymap'
import type { KeyId } from '@/core/types'

interface CommandLineProps {
  inputRef: RefObject<HTMLInputElement | null>
  disabled: boolean
  /** The prefix key that is waiting for its second key, or null. */
  pendingPrefix: KeyId | null
  onSubmit: (line: string) => void
}

function PrefixBadge({ prefix }: { prefix: KeyId }) {
  const { t } = useTranslation()
  return (
    <span role="status" className="mr-2 shrink-0 animate-pulse rounded-control border border-term-warning/40 bg-term-warning/15 px-2 py-0.5 font-display text-xs text-term-warning">
      {t('terminal.prefixBadge', { key: displayKey(prefix) })}
    </span>
  )
}

/** The command box under the terminal, with Up / Down recalling earlier lines. */
export function CommandLine({ inputRef, disabled, pendingPrefix, onSubmit }: CommandLineProps) {
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
    <div className="flex shrink-0 items-center border-t border-term-line bg-linear-to-b from-term-surface to-term-bg px-3 py-2.5 font-mono text-sm focus-within:ring-2 focus-within:ring-term-cursor/70 focus-within:ring-inset">
      {pendingPrefix !== null && <PrefixBadge prefix={pendingPrefix} />}
      <span aria-hidden className="mr-1.5 font-bold text-term-prompt">$</span>
      <input
        ref={inputRef}
        type="text"
        aria-label={t('game.commandBox')}
        value={input}
        onChange={event => setInput(event.target.value)}
        onKeyDown={handleKeyDown}
        className="min-w-0 flex-1 bg-transparent text-term-text caret-term-prompt outline-none placeholder:text-term-faint"
        placeholder={pendingPrefix !== null ? t('game.prefixActive') : t('game.commandPlaceholder')}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        disabled={disabled}
      />
    </div>
  )
}
