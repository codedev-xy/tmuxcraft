import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface FileEditorProps {
  path: string
  initialText: string
  onSave: (text: string) => void
  onClose: () => void
}

const BUTTON = 'cursor-pointer rounded px-2 py-0.5 font-[family-name:var(--font-ui)] text-xs'

/** What `vim` / `nano` open: a plain text box over the panes, with the file's path as its name. */
export function FileEditor({ path, initialText, onSave, onClose }: FileEditorProps) {
  const { t } = useTranslation()
  const [text, setText] = useState(initialText)
  const [saved, setSaved] = useState(initialText)

  const save = () => {
    onSave(text)
    setSaved(text)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg" style={{ background: '#0f172a', border: '2px solid #0ea5e9' }}>
      <div className="flex shrink-0 items-center gap-2 px-3 py-1.5" style={{ background: '#1e293b', borderBottom: '1px solid #334155' }}>
        <span className="flex-1 font-[family-name:var(--font-mono)] text-xs" style={{ color: '#94a3b8' }}>
          {path}{text === saved ? '' : ' *'}
        </span>
        <button type="button" onClick={save} className={BUTTON} style={{ background: '#0ea5e9', color: '#ffffff', border: 'none' }}>
          {t('common.save')}
        </button>
        <button type="button" onClick={onClose} className={BUTTON} style={{ background: 'transparent', color: '#94a3b8', border: '1px solid #475569' }}>
          {t('common.close')}
        </button>
      </div>
      <textarea
        aria-label={path}
        autoFocus
        spellCheck={false}
        value={text}
        onChange={event => setText(event.target.value)}
        className="flex-1 resize-none bg-transparent p-3 font-[family-name:var(--font-mono)] text-xs leading-relaxed outline-none"
        style={{ color: '#e2e8f0', caretColor: '#22c55e' }}
      />
    </div>
  )
}
