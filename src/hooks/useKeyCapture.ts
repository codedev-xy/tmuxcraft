import { useEffect, useRef } from 'react'
import { keyFromEvent } from '@/core/keymap'
import type { KeyId } from '@/core/types'

/**
 * Offers every key press to tmux first, in tmux notation. `onKey` returns true when tmux took the
 * key; it is then kept from the page (the focused input, browser shortcuts).
 */
export function useKeyCapture(onKey: (key: KeyId) => boolean, enabled = true): void {
  const onKeyRef = useRef(onKey)

  useEffect(() => {
    onKeyRef.current = onKey
  }, [onKey])

  useEffect(() => {
    if (!enabled) return
    const listener = (event: KeyboardEvent) => {
      if (event.isComposing) return
      const key = keyFromEvent(event)
      if (key === null || !onKeyRef.current(key)) return
      event.preventDefault()
      event.stopPropagation()
    }
    // Capture phase on window: ahead of the command box, which would otherwise type the key.
    window.addEventListener('keydown', listener, true)
    return () => window.removeEventListener('keydown', listener, true)
  }, [enabled])
}
