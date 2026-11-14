import { useRef, useCallback, useState, useEffect } from 'react'
import { TmuxEngine } from '@/core/tmux-engine'
import type { TmuxState, ParsedCommand } from '@/core/types'

export function useTmuxEngine(initialState?: TmuxState) {
  const [engine] = useState(() => new TmuxEngine(initialState))
  const [state, setState] = useState<TmuxState>(() => engine.getState())
  const initialStateRef = useRef(initialState)

  useEffect(() => {
    return engine.on(event => {
      if (event.type === 'state-changed') setState(engine.getState())
    })
  }, [engine])

  // Reset engine when initialState changes (e.g., navigating to next level)
  useEffect(() => {
    if (initialState !== initialStateRef.current) {
      initialStateRef.current = initialState
      engine.reset(initialState)
    }
  }, [engine, initialState])

  const execute = useCallback((command: ParsedCommand) => {
    engine.execute(command)
    return engine.getState()
  }, [engine])

  const reset = useCallback((newState?: TmuxState) => {
    engine.reset(newState)
  }, [engine])

  return { state, execute, reset, engine }
}
