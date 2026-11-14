import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { PromptState } from '@/core/types'

interface PromptLineProps {
  prompt: PromptState
  onSubmit: (text: string) => void
  onCancel: () => void
}

const BAR = 'flex shrink-0 items-center gap-2 bg-term-warning px-2.5 py-1 font-mono text-xs text-term-bg'
const INPUT = 'min-w-0 flex-1 bg-transparent caret-term-bg outline-none'

/** Keys that only modify the next one; a yes/no question waits through them (Shift for `Y`). */
const MODIFIERS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Dead', 'Process', 'Unidentified'])

/** tmux's yes/no question (`confirm-before`): one key answers it, `y` for yes and anything else for no. */
function ConfirmPrompt({ prompt, onSubmit, onCancel }: PromptLineProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const answered = useRef(false)

  useEffect(() => { inputRef.current?.focus() }, [])

  const answer = (key: string) => {
    if (answered.current) return
    answered.current = true
    if (key === 'y' || key === 'Y') onSubmit('y')
    else onCancel()
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (MODIFIERS.has(event.key) || event.nativeEvent.isComposing) return
    event.preventDefault()
    answer(event.key)
  }

  return (
    <div role="alert" className={BAR}>
      <span>{prompt.label}</span>
      <input
        ref={inputRef}
        aria-label={prompt.label}
        value=""
        onKeyDown={handleKeyDown}
        // Some touch keyboards send no usable keydown, only the typed text.
        onChange={event => event.target.value !== '' && answer(event.target.value[0])}
        onBlur={() => setTimeout(() => inputRef.current?.focus())}
        className={INPUT}
      />
    </div>
  )
}

/** tmux's text prompt (`Ctrl+b ,`, `Ctrl+b :`): Enter runs it, Escape closes it. */
function TextPrompt({ prompt, onSubmit, onCancel }: PromptLineProps) {
  const [text, setText] = useState(prompt.initial)
  return (
    <div className={BAR}>
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
        className={INPUT}
      />
    </div>
  )
}

export function PromptLine(props: PromptLineProps) {
  return props.prompt.confirm ? <ConfirmPrompt {...props} /> : <TextPrompt {...props} />
}
