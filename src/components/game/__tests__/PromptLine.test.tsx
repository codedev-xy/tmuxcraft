import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '@/i18n'
import type { PromptState } from '@/core/types'
import { PromptLine } from '../PromptLine'

beforeAll(() => i18n.changeLanguage('en'))

const CONFIRM: PromptState = { label: 'kill-pane 0? (y/n)', initial: '', template: 'kill-pane', confirm: true }
const TEXT: PromptState = { label: '(rename-window)', initial: 'bash', template: "rename-window '%%'" }

function show(prompt: PromptState) {
  const onSubmit = vi.fn<(text: string) => void>()
  const onCancel = vi.fn()
  render(
    <>
      <PromptLine prompt={prompt} onSubmit={onSubmit} onCancel={onCancel} />
      <button type="button">elsewhere</button>
    </>,
  )
  return { onSubmit, onCancel, user: userEvent.setup() }
}

describe('PromptLine, confirm', () => {
  it('is announced and holds the focus', () => {
    show(CONFIRM)
    expect(screen.getByRole('alert')).toHaveTextContent('kill-pane 0? (y/n)')
    expect(screen.getByRole('textbox', { name: 'kill-pane 0? (y/n)' })).toHaveFocus()
  })

  it.each(['y', 'Y'])('answers yes on %s', async key => {
    const { user, onSubmit, onCancel } = show(CONFIRM)
    await user.keyboard(key)
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('y')
    expect(onCancel).not.toHaveBeenCalled()
  })

  it.each(['n', '{Escape}', '{Enter}', 'x', ' '])('answers no on %s', async key => {
    const { user, onSubmit, onCancel } = show(CONFIRM)
    await user.keyboard(key)
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('waits through a bare modifier', async () => {
    const { user, onSubmit, onCancel } = show(CONFIRM)
    await user.keyboard('{Shift>}')
    expect(onCancel).not.toHaveBeenCalled()
    await user.keyboard('Y{/Shift}')
    expect(onSubmit).toHaveBeenCalledWith('y')
  })

  it('takes the focus back when it is moved away', async () => {
    const { user } = show(CONFIRM)
    await user.click(screen.getByRole('button', { name: 'elsewhere' }))
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'kill-pane 0? (y/n)' })).toHaveFocus())
  })
})

describe('PromptLine, text', () => {
  it('submits on Enter with what was typed', async () => {
    const { user, onSubmit } = show(TEXT)
    const input = screen.getByRole('textbox', { name: '(rename-window)' })
    expect(input).toHaveFocus()
    expect(input).toHaveValue('bash')
    await user.clear(input)
    await user.type(input, 'editor{Enter}')
    expect(onSubmit).toHaveBeenCalledWith('editor')
  })

  it('cancels on Escape', async () => {
    const { user, onSubmit, onCancel } = show(TEXT)
    await user.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
