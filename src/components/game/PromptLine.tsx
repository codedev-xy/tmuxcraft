import { useState } from 'react'
import type { PromptState } from '@/core/types'

interface PromptLineProps {
  prompt: PromptState
  onSubmit: (text: string) => void
  onCancel: () => void
}

/** tmux's own prompt (`Ctrl+b ,`, `Ctrl+b :`): Enter runs it, Escape closes it. */
export function PromptLine({ prompt, onSubmit, onCancel }: PromptLineProps) {
  const [text, setText] = useState(prompt.initial)

  return (
    <div
      className="flex shrink-0 items-center gap-2 font-[family-name:var(--font-mono)] text-xs"
      style={{ padding: '3px 10px', background: '#eab308', color: '#0f172a' }}
    >
      <span>{prompt.label}</span>
      <input
        aria-label={prompt.label}
        autoFocus
        value={text}
        onChange={event => setText(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Enter') onSubmit(text)
          if (event.key === 'Escape') onCancel()
        }}
        className="flex-1 bg-transparent outline-none"
      />
    </div>
  )
}
