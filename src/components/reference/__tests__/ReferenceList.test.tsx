import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '@/i18n'
import { REFERENCE, REFERENCE_ENTRIES } from '@/game/reference'
import { ReferenceList } from '../ReferenceList'

beforeAll(() => i18n.changeLanguage('en'))

const entries = () => screen.queryAllByRole('listitem')
const categoryHeadings = () => screen.queryAllByRole('heading').map(heading => heading.textContent)

/** Call after `userEvent.setup()`, which puts a clipboard of its own on the navigator. */
function setClipboard(clipboard: { writeText: (text: string) => Promise<void> } | undefined) {
  Object.defineProperty(navigator, 'clipboard', { value: clipboard, configurable: true, writable: true })
}

describe('ReferenceList', () => {
  it('lists every entry under its category', () => {
    render(<ReferenceList />)
    expect(entries()).toHaveLength(REFERENCE_ENTRIES.length)
    expect(categoryHeadings()).toEqual(REFERENCE.map(category => expect.stringContaining(i18n.t(`reference.categories.${category.id}`))))
  })

  it('shows key sequences as key caps and typed lines as code', () => {
    render(<ReferenceList />)
    const split = screen.getByText('Split the active pane into left and right').closest('li')!
    expect(within(split).getByText('Ctrl+b').tagName).toBe('KBD')
    expect(within(split).getByText('%').tagName).toBe('KBD')
    const created = screen.getByText('tmux new -s work')
    expect(created.tagName).toBe('CODE')
  })

  it('narrows the list to entries whose keys match, ignoring case', () => {
    render(<ReferenceList query="SELECT-LAYOUT" />)
    expect(entries()).toHaveLength(1)
    expect(screen.getByText(':select-layout even-horizontal')).toBeInTheDocument()
    expect(categoryHeadings()).toEqual([expect.stringContaining('Pane')])
  })

  it('matches the translated description too', () => {
    render(<ReferenceList query="background" />)
    expect(screen.getByText('Leave the session; it keeps running in the background')).toBeInTheDocument()
    expect(screen.getByText('tmux new -d -s dev')).toBeInTheDocument()
    expect(screen.queryByText('tmux new -s work')).not.toBeInTheDocument()
  })

  it('matches keys as they are shown', () => {
    render(<ReferenceList query="ctrl+b %" />)
    expect(entries()).toHaveLength(1)
  })

  it('says so when nothing matches', () => {
    render(<ReferenceList query="zzzz" />)
    expect(entries()).toHaveLength(0)
    expect(screen.getByText('Nothing found for “zzzz”')).toBeInTheDocument()
  })

  it('copies a typed line and says it did', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    const user = userEvent.setup()
    setClipboard({ writeText })
    render(<ReferenceList query="tmux ls" />)
    await user.click(screen.getByRole('button', { name: 'Copy tmux ls' }))
    expect(writeText).toHaveBeenCalledWith('tmux ls')
    expect(await screen.findByText('Copied')).toBeInTheDocument()
  })

  it('says when the clipboard is not available', async () => {
    const user = userEvent.setup()
    setClipboard(undefined)
    render(<ReferenceList query="tmux ls" />)
    await user.click(screen.getByRole('button', { name: 'Copy tmux ls' }))
    expect(await screen.findByText('Could not copy')).toBeInTheDocument()
  })

  it('says when copying fails', async () => {
    const user = userEvent.setup()
    setClipboard({ writeText: () => Promise.reject(new Error('denied')) })
    render(<ReferenceList query="tmux ls" />)
    await user.click(screen.getByRole('button', { name: 'Copy tmux ls' }))
    expect(await screen.findByText('Could not copy')).toBeInTheDocument()
  })

  it('offers no copy button for key sequences', () => {
    render(<ReferenceList query="ctrl+b %" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('leaves out the blurbs and badges when compact', () => {
    render(<ReferenceList compact />)
    expect(entries()).toHaveLength(REFERENCE_ENTRIES.length)
    expect(screen.queryByText(i18n.t('reference.descriptions.pane'))).not.toBeInTheDocument()
    expect(screen.queryByText(i18n.t('reference.popular'))).not.toBeInTheDocument()
  })

  it('shows the blurbs and popular badges otherwise', () => {
    render(<ReferenceList />)
    expect(screen.getByText(i18n.t('reference.descriptions.pane'))).toBeInTheDocument()
    expect(screen.getAllByText(i18n.t('reference.popular')).length).toBe(REFERENCE_ENTRIES.filter(entry => entry.popular).length)
  })
})
