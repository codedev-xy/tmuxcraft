import type React from 'react'

const KEY_CAP = 'font-[family-name:var(--font-mono)] text-[0.85em] font-semibold px-2 py-0.5 rounded-[5px] bg-sky-50 border border-sky-200 shadow-[0_1px_2px_rgba(14,165,233,0.12)] text-sky-700 leading-[1.4]'

/** A shortcut stays on one line; a long command may wrap rather than push the panel wider. */
const NO_WRAP_UP_TO = 24

function keyCap(text: string, key: number): React.ReactNode {
  const wrapping = text.length <= NO_WRAP_UP_TO ? 'whitespace-nowrap inline-block' : 'break-words box-decoration-clone'
  return <kbd key={key} className={`${KEY_CAP} ${wrapping}`}>{text}</kbd>
}

/** Level text marks what the player types or presses with backticks; each marked span is shown as a key cap. */
export function renderHintText(text: string): React.ReactNode {
  return text.split(/`([^`]+)`/).map((part, index) => (index % 2 === 1 ? keyCap(part, index) : part))
}
