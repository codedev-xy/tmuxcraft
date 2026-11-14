import type { Direction, KeyId } from '@/core/types'
import type { PlayerInput } from './simulate'

// Short ways to write down what a player does, for reference solutions and tests.

/** A line typed in the command box and entered. */
export const line = (text: string): PlayerInput => ({ type: 'line', text })

/** Text entered into an open tmux prompt. */
export const prompt = (text: string): PlayerInput => ({ type: 'prompt', text })

export const key = (name: KeyId): PlayerInput => ({ type: 'key', key: name })

/** Keys pressed one after another: `keys('C-b', '%')`. */
export const keys = (...names: readonly KeyId[]): PlayerInput[] => names.map(key)

export const click = (paneId: string): PlayerInput => ({ type: 'click', paneId })

export const drag = (paneId: string, direction: Direction, cells: number): PlayerInput => ({ type: 'drag', paneId, direction, cells })

/** Saving a file from the editor. */
export const save = (path: string, text: string): PlayerInput => ({ type: 'save', path, text })
