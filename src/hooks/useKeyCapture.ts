import { useEffect, useRef, useState, useCallback } from 'react'
import { KeybindingHandler } from '@/core/keybinding-handler'
import type { KeyAction } from '@/core/types'

export function useKeyCapture(onAction: (action: KeyAction) => void, enabled = true) {
  const [prefixActive, setPrefixActive] = useState(false)
  const handlerRef = useRef<KeybindingHandler | null>(null)
  const onActionRef = useRef(onAction)
  onActionRef.current = onAction

  useEffect(() => {
    if (!enabled) return
    const handler = new KeybindingHandler()
    handlerRef.current = handler
    handler.onPrefixActivated = () => setPrefixActive(true)
    handler.onPrefixTimeout = () => setPrefixActive(false)
    handler.onKeybinding = (action) => {
      setPrefixActive(false)
      onActionRef.current(action)
    }
    const onKeyDown = (e: KeyboardEvent) => handler.handleKeyDown(e)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      handler.destroy()
    }
  }, [enabled])

  const getHandler = useCallback(() => handlerRef.current, [])

  return { prefixActive, getHandler }
}
