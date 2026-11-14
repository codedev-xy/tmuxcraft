import type { ReactNode } from 'react'
import { Kbd } from '@/components/ui/Kbd'

/** A shortcut stays on one line; a long command may wrap rather than push the panel wider. */
const NO_WRAP_UP_TO = 24

/** Level text marks what the player types or presses with backticks; each marked span is shown as a key cap. */
export function renderHintText(text: string, onDark = false): ReactNode {
  return text.split(/`([^`]+)`/).map((part, index) => (
    index % 2 === 1 ? <Kbd key={index} wrap={part.length > NO_WRAP_UP_TO} onDark={onDark}>{part}</Kbd> : part
  ))
}
