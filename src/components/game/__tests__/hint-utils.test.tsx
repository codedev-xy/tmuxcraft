import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { renderHintText } from '../hint-utils'

function show(text: string) {
  const { container } = render(<p>{renderHintText(text)}</p>)
  return {
    text: container.textContent,
    caps: Array.from(container.querySelectorAll('kbd')).map(cap => cap.textContent),
  }
}

describe('renderHintText', () => {
  it('leaves text without marks as it is', () => {
    expect(show('Split the window')).toEqual({ text: 'Split the window', caps: [] })
  })

  it('shows a backticked span as a key cap, without the backticks', () => {
    expect(show('Press `Ctrl+b %` to split')).toEqual({ text: 'Press Ctrl+b % to split', caps: ['Ctrl+b %'] })
  })

  it('shows every marked span', () => {
    expect(show('`Ctrl+b [`, then `Space`; paste with `Ctrl+b ]`').caps).toEqual(['Ctrl+b [', 'Space', 'Ctrl+b ]'])
  })

  it('keeps whatever is inside a span, quotes and all', () => {
    expect(show('输入 `:set -g status-right "%H:%M"`').caps).toEqual([':set -g status-right "%H:%M"'])
  })

  it('does not guess: an unmarked command stays plain text', () => {
    expect(show('Try tmux ls or Ctrl+b d').caps).toEqual([])
  })

  it('keeps a lone backtick as text', () => {
    expect(show('a ` b')).toEqual({ text: 'a ` b', caps: [] })
  })
})
