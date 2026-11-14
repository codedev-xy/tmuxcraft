import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Kbd } from '@/components/ui/Kbd'

interface FileEditorProps {
  path: string
  initialText: string
  onSave: (text: string) => void
  onClose: () => void
}

const isSaveShortcut = (event: KeyboardEvent) => (event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 's'

/**
 * What `vim` / `nano` open: a plain text box over the panes, with the file's path as its name.
 * Save (or Ctrl+S / Cmd+S) writes the file and leaves the editor (vim's `:wq`); Close leaves without writing.
 */
export function FileEditor({ path, initialText, onSave, onClose }: FileEditorProps) {
  const { t } = useTranslation()
  const [text, setText] = useState(initialText)

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isSaveShortcut(event)) return
    event.preventDefault()
    onSave(text)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-control border-2 border-term-cursor bg-term-bg focus-within:ring-2 focus-within:ring-term-cursor/40">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-term-line bg-term-surface px-3 py-1.5">
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-term-muted">
          {path}{text === initialText ? '' : ' *'}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-term-muted">
          <Kbd onDark>Ctrl+S</Kbd>
          <span>{t('terminal.saveHint')}</span>
        </span>
        <Button variant="primary" size="sm" onClick={() => onSave(text)}>{t('common.save')}</Button>
        <Button variant="dark-ghost" size="sm" onClick={onClose}>{t('common.close')}</Button>
      </div>
      <textarea
        aria-label={path}
        autoFocus
        spellCheck={false}
        value={text}
        onChange={event => setText(event.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 resize-none bg-transparent p-3 font-mono text-xs leading-relaxed text-term-text caret-term-prompt outline-none"
      />
    </div>
  )
}
