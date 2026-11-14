import { describe, it, expect, beforeAll } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import i18n from '@/i18n'
import { getActiveWindow } from '@/core/selectors'
import { afterLines, openTerminal } from './terminal-harness'

beforeAll(() => i18n.changeLanguage('en'))

/** The divider, with its split pretending to be `size` pixels along the drag. */
function divider(size: number): HTMLElement {
  const element = screen.getByRole('separator')
  const rect = { x: 0, y: 0, top: 0, left: 0, width: size, height: size, right: size, bottom: size, toJSON: () => ({}) }
  element.parentElement!.getBoundingClientRect = () => rect as DOMRect
  return element
}

const flexOf = (element: Element | null) => (element as HTMLElement | null)?.style.flex

describe('dragging a pane border', () => {
  it('is a vertical separator between side-by-side panes and a horizontal one between stacked panes', () => {
    const single = openTerminal(afterLines())
    expect(screen.queryByRole('separator')).toBeNull()
    single.view.unmount()
    const sideBySide = openTerminal(afterLines(':split-window -h'))
    expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'vertical')
    sideBySide.view.unmount()
    openTerminal(afterLines(':split-window'))
    expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'horizontal')
  })

  it('resizes with the mouse on: previews while moving and runs one command on release', () => {
    const { onResult, lastResult } = openTerminal(afterLines(':split-window -h', ':set -g mouse on'))
    const handle = divider(500)
    expect(handle).toHaveClass('cursor-col-resize')
    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientX: 100, clientY: 0 })
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 130, clientY: 0 })
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 150, clientY: 0 })
    expect(flexOf(handle.previousElementSibling)).toBe('0.6 1 0%')
    expect(onResult).not.toHaveBeenCalled()
    fireEvent.pointerUp(handle, { pointerId: 1, clientX: 150, clientY: 0 })
    expect(onResult).toHaveBeenCalledTimes(1)
    expect(lastResult()).toMatchObject({ handled: true, counted: true })
    expect(getActiveWindow(lastResult().state)!.layoutTree.ratio).toBe(0.6)
    expect(flexOf(handle.previousElementSibling)).toBe('0.6 1 0%')
  })

  it('moves stacked panes with an up-down drag', () => {
    const { lastResult } = openTerminal(afterLines(':split-window', ':set -g mouse on'))
    const handle = divider(400)
    expect(handle).toHaveClass('cursor-row-resize')
    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientX: 0, clientY: 200 })
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 0, clientY: 120 })
    fireEvent.pointerUp(handle, { pointerId: 1, clientX: 0, clientY: 120 })
    expect(getActiveWindow(lastResult().state)!.layoutTree.ratio).toBe(0.3)
  })

  it('sends nothing for a drag that is cancelled or too short to move a cell', () => {
    const { onResult } = openTerminal(afterLines(':split-window -h', ':set -g mouse on'))
    const handle = divider(500)
    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientX: 100 })
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 200 })
    fireEvent.pointerCancel(handle, { pointerId: 1 })
    expect(flexOf(handle.previousElementSibling)).toBe('0.5 1 0%')
    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientX: 100 })
    fireEvent.pointerUp(handle, { pointerId: 1, clientX: 101 })
    expect(onResult).not.toHaveBeenCalled()
  })

  it('is inert with the mouse off', () => {
    const { onResult } = openTerminal(afterLines(':split-window -h'))
    const handle = divider(500)
    expect(handle).not.toHaveClass('cursor-col-resize')
    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientX: 100 })
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 200 })
    fireEvent.pointerUp(handle, { pointerId: 1, clientX: 200 })
    expect(flexOf(handle.previousElementSibling)).toBe('0.5 1 0%')
    expect(onResult).not.toHaveBeenCalled()
  })

  it('shows the command a drag ran in the log', () => {
    openTerminal(afterLines(':split-window -h', ':set -g mouse on'))
    const handle = divider(500)
    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientX: 100 })
    fireEvent.pointerUp(handle, { pointerId: 1, clientX: 150 })
    const line = screen.getByRole('log').querySelector('[data-kind="command"]')
    expect(line).toHaveTextContent('Mouse drag')
    expect(line).toHaveTextContent('resize-pane')
  })
})

describe('clicking a pane', () => {
  it('selects it with the mouse on and logs the command', async () => {
    const { user, panes, activePane } = openTerminal(afterLines(':split-window -h', ':set -g mouse on'))
    const [left] = panes()
    await user.click(left)
    expect(activePane()).toBe(left.dataset.paneId)
    expect(screen.getByRole('log').querySelector('[data-kind="command"]')).toHaveTextContent('select-pane')
  })
})
