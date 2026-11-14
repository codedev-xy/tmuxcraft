import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dialog } from '../Dialog'

function Harness({ onClose }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false)
  const close = () => {
    onClose?.()
    setOpen(false)
  }
  return (
    <>
      <button onClick={() => setOpen(true)}>open</button>
      <Dialog open={open} title="Reset progress?" onClose={close}>
        <button onClick={close}>Cancel</button>
        <button>Confirm</button>
      </Dialog>
    </>
  )
}

async function openDialog() {
  const user = userEvent.setup()
  render(<Harness />)
  await user.click(screen.getByRole('button', { name: 'open' }))
  return user
}

describe('Dialog', () => {
  it('renders nothing while closed', () => {
    render(<Harness />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('is a modal dialog named by its title', async () => {
    await openDialog()
    const dialog = screen.getByRole('dialog', { name: 'Reset progress?' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('moves the focus to its first control when it opens', async () => {
    await openDialog()
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
  })

  it('starts on the control marked data-autofocus when there is one', () => {
    render(
      <Dialog open title="Done">
        <button>Retry</button>
        <button data-autofocus>Next</button>
      </Dialog>,
    )
    expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus()
  })

  it('keeps Tab and Shift+Tab inside the dialog', async () => {
    const user = await openDialog()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Confirm' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Confirm' })).toHaveFocus()
  })

  it('brings the focus back in when Tab is pressed from outside', async () => {
    const user = await openDialog()
    screen.getByRole<HTMLButtonElement>('button', { name: 'Cancel' }).blur()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
  })

  it('closes on Escape and gives the focus back to what opened it', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<Harness onClose={onClose} />)
    const opener = screen.getByRole('button', { name: 'open' })
    await user.click(opener)
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(opener).toHaveFocus()
  })

  it('ignores Escape when it cannot be dismissed', async () => {
    const user = userEvent.setup()
    render(<Dialog open title="Done"><button>Next</button></Dialog>)
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
