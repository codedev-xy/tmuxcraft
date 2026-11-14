import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '@/i18n'
import { formatError } from '@/i18n/format-error'
import { defaultState, emptyState } from '@/core/state'
import type { TmuxState } from '@/core/types'
import type { InputResult } from '@/game/sim/simulate'
import { simulate } from '@/game/sim/simulate'
import { useTmuxSession } from '@/hooks/useTmuxSession'
import { PREFIX_TIMEOUT_MS, TerminalView } from '../TerminalView'

function Harness({ initial, onResult, disabled }: { initial: TmuxState; onResult?: (result: InputResult) => void; disabled?: boolean }) {
  const session = useTmuxSession(initial)
  return <TerminalView session={session} onResult={onResult} disabled={disabled} />
}

function open(initial: TmuxState = defaultState(), disabled = false) {
  const onResult = vi.fn<(result: InputResult) => void>()
  const view = render(<Harness initial={initial} onResult={onResult} disabled={disabled} />)
  const panes = () => Array.from(view.container.querySelectorAll<HTMLElement>('[data-pane-id]'))
  const activePane = () => view.container.querySelector<HTMLElement>('[data-pane-id][data-active="true"]')?.dataset.paneId
  const lastResult = () => onResult.mock.calls.at(-1)![0]
  return { user: userEvent.setup(), onResult, panes, activePane, lastResult, commandBox: () => screen.getByRole<HTMLInputElement>('textbox', { name: 'command' }) }
}

const afterLines = (...lines: string[]): TmuxState =>
  simulate(defaultState(), lines.map(text => ({ type: 'line', text }))).state

beforeAll(() => i18n.changeLanguage('en'))
afterEach(() => vi.useRealTimers())

describe('TerminalView', () => {
  it('runs a typed line, reports it and echoes it', async () => {
    const { user, panes, onResult, commandBox } = open()
    await user.type(commandBox(), ':split-window{Enter}')
    expect(panes()).toHaveLength(2)
    expect(onResult).toHaveBeenLastCalledWith(expect.objectContaining({ ok: true, counted: true }))
    expect(screen.getByText(':split-window')).toBeInTheDocument()
    expect(commandBox()).toHaveValue('')
  })

  it('shows an error in the player\'s language', async () => {
    const { user, lastResult, commandBox } = open()
    await user.type(commandBox(), ':splt-window{Enter}')
    const [error] = lastResult().errors
    expect(error.suggestion).toBe('split-window')
    expect(screen.getByText(formatError(i18n.t, error))).toBeInTheDocument()
  })

  it('recalls earlier lines with the arrow keys', async () => {
    const { user, commandBox } = open()
    await user.type(commandBox(), 'echo one{Enter}echo two{Enter}{ArrowUp}{ArrowUp}')
    expect(commandBox()).toHaveValue('echo one')
    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(commandBox()).toHaveValue('')
  })

  it('takes the prefix key and the key after it away from the command box', async () => {
    const { user, panes, commandBox } = open()
    await user.click(commandBox())
    await user.keyboard('{Control>}b{/Control}')
    expect(screen.getByText('PREFIX')).toBeInTheDocument()
    await user.keyboard('%')
    expect(panes()).toHaveLength(2)
    expect(commandBox()).toHaveValue('')
    expect(screen.queryByText('PREFIX')).not.toBeInTheDocument()
  })

  it('drops a prefix that is not followed up', () => {
    vi.useFakeTimers()
    const { panes } = open()
    fireEvent.keyDown(document.body, { key: 'b', ctrlKey: true })
    expect(screen.getByText('PREFIX')).toBeInTheDocument()
    act(() => { vi.advanceTimersByTime(PREFIX_TIMEOUT_MS) })
    expect(screen.queryByText('PREFIX')).not.toBeInTheDocument()
    fireEvent.keyDown(document.body, { key: '%' })
    expect(panes()).toHaveLength(1)
  })

  it('renames a window through the prompt and gives the focus back', async () => {
    const { user, commandBox } = open()
    await user.click(commandBox())
    await user.keyboard('{Control>}b{/Control},')
    const prompt = screen.getByRole<HTMLInputElement>('textbox', { name: '(rename-window)' })
    expect(prompt).toHaveFocus()
    expect(prompt).toHaveValue('bash')
    await user.clear(prompt)
    await user.type(prompt, 'editor{Enter}')
    expect(screen.getByText('0:editor*')).toBeInTheDocument()
    expect(commandBox()).toHaveFocus()
  })

  it('closes the prompt on Escape without running anything', async () => {
    const { user, onResult, commandBox } = open()
    await user.click(commandBox())
    await user.keyboard('{Control>}b{/Control},')
    onResult.mockClear()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('textbox', { name: '(rename-window)' })).not.toBeInTheDocument()
    expect(screen.getByText('0:bash*')).toBeInTheDocument()
    expect(onResult.mock.calls.every(([result]) => !result.counted)).toBe(true)
  })

  it('shows the terminal outside tmux while detached', async () => {
    const { user, panes, commandBox } = open(emptyState())
    expect(panes().map(pane => pane.dataset.paneId)).toEqual(['outer'])
    await user.type(commandBox(), 'tmux new -s work{Enter}')
    expect(panes().map(pane => pane.dataset.paneId)).not.toContain('outer')
    expect(screen.getByText('[work]')).toBeInTheDocument()
  })

  it('draws the status line from the options', () => {
    open(afterLines(':set -g status-left "<#S> "', ':set -g status-right "#H"', ':set -g status-position top'))
    expect(screen.getByText('<0>')).toBeInTheDocument()
    expect(screen.getByText('tmuxcraft')).toBeInTheDocument()
    expect(screen.getByTestId('status-line')).toHaveAttribute('data-position', 'top')
  })

  it('hides the status line when it is turned off', () => {
    open(afterLines(':set -g status off'))
    expect(screen.queryByTestId('status-line')).not.toBeInTheDocument()
  })

  it('shows only the active pane while zoomed', () => {
    const { panes } = open(afterLines(':split-window', ':resize-pane -Z'))
    expect(panes()).toHaveLength(1)
  })

  it('shows what is typed at a pane\'s prompt', () => {
    open(afterLines(':send-keys "npm run dev"'))
    expect(screen.getByText('npm run dev')).toBeInTheDocument()
  })

  it('ignores a click on a pane while the mouse is off', async () => {
    const { user, panes, activePane } = open(afterLines(':split-window -h'))
    const [left] = panes()
    await user.click(left)
    expect(activePane()).not.toBe(left.dataset.paneId)
  })

  it('selects a pane by click once the mouse is on', async () => {
    const { user, panes, activePane, onResult } = open(afterLines(':split-window -h', ':set -g mouse on'))
    const [left] = panes()
    await user.click(left)
    expect(activePane()).toBe(left.dataset.paneId)
    expect(onResult).toHaveBeenLastCalledWith(expect.objectContaining({ counted: true }))
  })

  it('edits a file opened with vim; saving writes it and leaves the editor', async () => {
    const { user, lastResult, commandBox, panes } = open()
    await user.type(commandBox(), 'vim notes.txt{Enter}')
    const editor = screen.getByRole('textbox', { name: '~/notes.txt' })
    expect(editor).toHaveFocus()
    await user.type(editor, 'set -g mouse on')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(lastResult().state.files['~/notes.txt']).toBe('set -g mouse on')
    expect(lastResult().counted).toBe(true)
    expect(screen.queryByRole('textbox', { name: '~/notes.txt' })).not.toBeInTheDocument()
    expect(panes()).toHaveLength(1)
    expect(commandBox()).toHaveFocus()
  })

  it('leaves the editor without writing anything on Close', async () => {
    const { user, onResult, commandBox } = open()
    await user.type(commandBox(), 'vim notes.txt{Enter}')
    const opened = onResult.mock.calls.length
    await user.type(screen.getByRole('textbox', { name: '~/notes.txt' }), 'draft')
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('textbox', { name: '~/notes.txt' })).not.toBeInTheDocument()
    expect(onResult).toHaveBeenCalledTimes(opened)
    expect(commandBox()).toHaveFocus()
    await user.type(commandBox(), 'cat notes.txt{Enter}')
    expect(onResult.mock.calls.at(-1)![0].ok).toBe(false)
  })

  it('keeps keys inside copy mode until it is left', async () => {
    const { user, commandBox } = open()
    await user.click(commandBox())
    await user.keyboard('{Control>}b{/Control}[[')
    expect(screen.getByText('COPY')).toBeInTheDocument()
    await user.keyboard('q')
    expect(screen.queryByText('COPY')).not.toBeInTheDocument()
    expect(commandBox()).toHaveValue('')
  })

  it('takes no input while disabled', () => {
    const { panes, commandBox } = open(defaultState(), true)
    expect(commandBox()).toBeDisabled()
    fireEvent.keyDown(document.body, { key: 'b', ctrlKey: true })
    fireEvent.keyDown(document.body, { key: '%' })
    expect(panes()).toHaveLength(1)
  })
})
