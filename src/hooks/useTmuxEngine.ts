import { useRef, useCallback, useState, useEffect } from 'react'
import { TmuxEngine } from '@/core/tmux-engine'
import type { TmuxState, ParsedCommand } from '@/core/types'

export function useTmuxEngine(initialState?: TmuxState) {
  const engineRef = useRef(new TmuxEngine(initialState))
  const [state, setState] = useState<TmuxState>(() => engineRef.current.getState())
  const initialStateRef = useRef(initialState)

  // Reset engine when initialState changes (e.g., navigating to next level)
  useEffect(() => {
    if (initialState !== initialStateRef.current) {
      initialStateRef.current = initialState
      engineRef.current.reset(initialState)
      setState(engineRef.current.getState())
    }
  }, [initialState])

  const execute = useCallback((command: ParsedCommand) => {
    engineRef.current.execute(command)
    const newState = engineRef.current.getState()
    setState(newState)
    return newState
  }, [])

  const reset = useCallback((newState?: TmuxState) => {
    engineRef.current.reset(newState)
    setState(engineRef.current.getState())
  }, [])

  return { state, execute, reset, engine: engineRef.current }
}
