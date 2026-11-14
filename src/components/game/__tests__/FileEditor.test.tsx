import { describe, it, expect, vi, beforeAll } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '@/i18n'
import { FileEditor } from '../FileEditor'
import { openTerminal } from './terminal-harness'

beforeAll(() => i18n.changeLanguage('en'))

function edit() {
  const onSave = vi.fn<(text: string) => void>()
  const onClose = vi.fn()
  render(<FileEditor path="~/.tmux.conf" initialText="set -g mouse on" onSave={onSave} onClose={onClose} />)
  return { onSave, onClose, textarea: screen.getByRole('textbox', { name: '~/.tmux.conf' }) }
}

describe('FileEditor', () => {
  it.each([
    ['Ctrl+S', { ctrlKey: true }],
    ['Cmd+S', { metaKey: true }],
    ['Ctrl+Shift+S', { ctrlKey: true, shiftKey: true, key: 'S' }],
  ])('saves and leaves on %s, keeping the browser from saving the page', (_, init) => {
    const { onSave, textarea } = edit()
    fireEvent.change(textarea, { target: { value: 'set -g mouse off' } })
    const notPrevented = fireEvent.keyDown(textarea, { key: 's', ...init })
    expect(notPrevented).toBe(false)
    expect(onSave).toHaveBeenCalledWith('set -g mouse off')
  })

  it('leaves other keys to the text box', () => {
    const { onSave, textarea } = edit()
    expect(fireEvent.keyDown(textarea, { key: 's' })).toBe(true)
    expect(fireEvent.keyDown(textarea, { key: 'a', ctrlKey: true })).toBe(true)
    expect(onSave).not.toHaveBeenCalled()
  })

  it('shows the save shortcut', () => {
    edit()
    expect(screen.getByText('Ctrl+S')).toBeInTheDocument()
    expect(screen.getByText(i18n.t('terminal.saveHint'))).toBeInTheDocument()
  })

  it('closes without saving', async () => {
    const { onSave, onClose } = edit()
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onSave).not.toHaveBeenCalled()
  })
})

describe('the editor in the terminal', () => {
  it('keeps tmux keys out: Ctrl+b % types into the file and splits nothing', async () => {
    const { user, commandBox, panes, lastResult } = openTerminal()
    await user.type(commandBox(), 'vim notes.txt{Enter}')
    const editor = screen.getByRole('textbox', { name: '~/notes.txt' })
    await user.keyboard('{Control>}b{/Control}%')
    await user.type(editor, ' a"b|c')
    expect(editor).toHaveValue('% a"b|c')
    await user.keyboard('{Control>}s{/Control}')
    expect(lastResult().state.files['~/notes.txt']).toBe('% a"b|c')
    expect(lastResult().state.prefixPending).toBe(false)
    expect(screen.queryByRole('textbox', { name: '~/notes.txt' })).not.toBeInTheDocument()
    expect(panes()).toHaveLength(1)
  })
})
