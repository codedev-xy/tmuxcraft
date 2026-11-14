import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useKeyCapture } from '../useKeyCapture'

const seenByPage = vi.fn()

function press(init: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
  document.addEventListener('keydown', seenByPage)
  document.body.dispatchEvent(event)
  document.removeEventListener('keydown', seenByPage)
  return event
}

afterEach(() => seenByPage.mockClear())

describe('useKeyCapture', () => {
  it('passes keys on in tmux notation', () => {
    const onKey = vi.fn<(key: string) => boolean>(() => false)
    renderHook(() => useKeyCapture(onKey))
    press({ key: 'b', ctrlKey: true })
    press({ key: '%', shiftKey: true })
    press({ key: 'ArrowLeft' })
    expect(onKey.mock.calls.map(call => call[0])).toEqual(['C-b', '%', 'Left'])
  })

  it('keeps a key tmux took away from the page', () => {
    renderHook(() => useKeyCapture(() => true))
    const event = press({ key: 'b', ctrlKey: true })
    expect(event.defaultPrevented).toBe(true)
    expect(seenByPage).not.toHaveBeenCalled()
  })

  it('leaves a key tmux did not take to the page', () => {
    renderHook(() => useKeyCapture(() => false))
    const event = press({ key: 'a' })
    expect(event.defaultPrevented).toBe(false)
    expect(seenByPage).toHaveBeenCalledTimes(1)
  })

  it('ignores bare modifiers and keys typed through an input method', () => {
    const onKey = vi.fn(() => true)
    renderHook(() => useKeyCapture(onKey))
    press({ key: 'Control', ctrlKey: true })
    const composing = press({ key: 'a', isComposing: true })
    expect(onKey).not.toHaveBeenCalled()
    expect(composing.defaultPrevented).toBe(false)
  })

  it('does nothing while disabled', () => {
    const onKey = vi.fn(() => true)
    renderHook(() => useKeyCapture(onKey, false))
    expect(press({ key: 'b', ctrlKey: true }).defaultPrevented).toBe(false)
    expect(onKey).not.toHaveBeenCalled()
  })

  it('stops listening when unmounted', () => {
    const onKey = vi.fn(() => true)
    renderHook(() => useKeyCapture(onKey)).unmount()
    press({ key: 'b', ctrlKey: true })
    expect(onKey).not.toHaveBeenCalled()
  })
})
