import type React from 'react'

/**
 * Pre-compiled regex for hint text parsing.
 * Matches keyboard shortcuts and commands to wrap in <kbd> elements.
 */
const HINT_PATTERN = new RegExp(
  [
    /Ctrl\+b\s+Ctrl\+(?:方向键|[a-zA-Z0-9→←↑↓]+)/.source,
    /Ctrl\+b\s+(?:Space|方向键|Arrow|数字)/.source,
    /Ctrl\+b\s+\S(?:\/\S)?/.source,
    /:[a-z][-a-z]*(?:\s+[-a-zA-Z0-9<>~%/.'":_]+)*/.source,
    /tmux\s+(?:new(?:\s+-s\s+\S+)?|attach(?:\s+-t\s+\S+)?|ls)/.source,
    /\bexit\b/.source,
  ].join('|'),
  'g',
)

/**
 * Parse hint text and wrap keyboard shortcuts / commands in styled <kbd> elements.
 */
export function renderHintText(text: string): React.ReactNode {
  const pattern = HINT_PATTERN
  pattern.lastIndex = 0

  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let keyIdx = 0

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    parts.push(
      <kbd
        key={keyIdx++}
        className="font-[family-name:var(--font-mono)] text-[0.85em] font-semibold px-2 py-0.5 rounded-[5px] bg-sky-50 border border-sky-200 shadow-[0_1px_2px_rgba(14,165,233,0.12)] text-sky-700 whitespace-nowrap inline-block leading-[1.4]"
      >
        {match[0]}
      </kbd>
    )
    lastIndex = pattern.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : text
}
