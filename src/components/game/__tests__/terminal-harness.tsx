import { vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { defaultState } from '@/core/state'
import type { TmuxState } from '@/core/types'
import type { InputResult } from '@/game/sim/simulate'
import { simulate } from '@/game/sim/simulate'
import { Harness } from './TerminalHarness'

/** Renders a terminal on its own session, with helpers to find its panes and its command box. */
export function openTerminal(initial: TmuxState = defaultState(), disabled = false) {
  const onResult = vi.fn<(result: InputResult) => void>()
  const view = render(<Harness initial={initial} onResult={onResult} disabled={disabled} />)
  const panes = () => Array.from(view.container.querySelectorAll<HTMLElement>('[data-pane-id]'))
  const activePane = () => view.container.querySelector<HTMLElement>('[data-pane-id][data-active="true"]')?.dataset.paneId
  const lastResult = () => onResult.mock.calls.at(-1)![0]
  const commandBox = () => screen.getByRole<HTMLInputElement>('textbox', { name: 'command' })
  return { view, user: userEvent.setup(), onResult, panes, activePane, lastResult, commandBox }
}

/** The state after typing `lines` one by one into a fresh default session. */
export const afterLines = (...lines: string[]): TmuxState =>
  simulate(defaultState(), lines.map(text => ({ type: 'line', text }))).state
