import type { KeyAction, KeyBindingMap, PrefixState, CommandType } from './types'

const DEFAULT_BINDINGS: KeyBindingMap = {
  '"': { command: 'split-horizontal', display: 'Split Horizontal' },
  '%': { command: 'split-vertical', display: 'Split Vertical' },
  'c': { command: 'new-window', display: 'New Window' },
  'n': { command: 'next-window', display: 'Next Window' },
  'p': { command: 'previous-window', display: 'Previous Window' },
  'x': { command: 'close-pane', display: 'Close Pane' },
  'z': { command: 'zoom-pane', display: 'Zoom Pane' },
  'd': { command: 'detach', display: 'Detach' },
  ',': { command: 'rename-window', display: 'Rename Window' },
  '{': { command: 'swap-pane', args: { direction: 'up' }, display: 'Swap Pane Up' },
  '}': { command: 'swap-pane', args: { direction: 'down' }, display: 'Swap Pane Down' },
  '!': { command: 'break-pane', display: 'Break Pane' },
  ' ': { command: 'next-layout', display: 'Next Layout' },
  '[': { command: 'enter-copy-mode', display: 'Copy Mode' },
  ']': { command: 'paste', display: 'Paste' },
  's': { command: 'list-sessions', display: 'List Sessions' },
  'ArrowUp': { command: 'select-pane', args: { direction: 'up' }, display: 'Select Pane Up' },
  'ArrowDown': { command: 'select-pane', args: { direction: 'down' }, display: 'Select Pane Down' },
  'ArrowLeft': { command: 'select-pane', args: { direction: 'left' }, display: 'Select Pane Left' },
  'ArrowRight': { command: 'select-pane', args: { direction: 'right' }, display: 'Select Pane Right' },
  '0': { command: 'select-window', args: { index: 0 }, display: 'Window 0' },
  '1': { command: 'select-window', args: { index: 1 }, display: 'Window 1' },
  '2': { command: 'select-window', args: { index: 2 }, display: 'Window 2' },
  '3': { command: 'select-window', args: { index: 3 }, display: 'Window 3' },
  '4': { command: 'select-window', args: { index: 4 }, display: 'Window 4' },
  '5': { command: 'select-window', args: { index: 5 }, display: 'Window 5' },
  '6': { command: 'select-window', args: { index: 6 }, display: 'Window 6' },
  '7': { command: 'select-window', args: { index: 7 }, display: 'Window 7' },
  '8': { command: 'select-window', args: { index: 8 }, display: 'Window 8' },
  '9': { command: 'select-window', args: { index: 9 }, display: 'Window 9' },
}

const CTRL_ARROW_BINDINGS: Record<string, KeyAction> = {
  'ArrowUp': { command: 'resize-pane', args: { direction: 'up', amount: 5 }, display: 'Resize Up' },
  'ArrowDown': { command: 'resize-pane', args: { direction: 'down', amount: 5 }, display: 'Resize Down' },
  'ArrowLeft': { command: 'resize-pane', args: { direction: 'left', amount: 5 }, display: 'Resize Left' },
  'ArrowRight': { command: 'resize-pane', args: { direction: 'right', amount: 5 }, display: 'Resize Right' },
}

export class KeybindingHandler {
  private prefixKey = 'b'
  private prefixModifier = 'Control'
  private _state: PrefixState = 'idle'
  private bindings: KeyBindingMap = { ...DEFAULT_BINDINGS }
  private timeoutId: ReturnType<typeof setTimeout> | null = null

  onPrefixActivated?: () => void
  onPrefixTimeout?: () => void
  onKeybinding?: (action: KeyAction) => void

  handleKeyDown(event: KeyboardEvent): KeyAction | null {
    if (this._state === 'idle') {
      if (this.isPrefixKey(event)) {
        event.preventDefault()
        this._state = 'waiting'
        this.onPrefixActivated?.()
        this.startTimeout()
        return null
      }
      return null
    }

    // State is 'waiting' - process the second key
    // Ignore modifier-only keys (Shift, Control, Alt, Meta) so that
    // shortcuts like Ctrl+b " (which requires Shift) work correctly
    if (['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) {
      return null
    }

    event.preventDefault()
    this.clearTimeout()
    this._state = 'idle'

    // Check Ctrl+Arrow for resize
    if (event.ctrlKey || event.metaKey) {
      const ctrlAction = CTRL_ARROW_BINDINGS[event.key]
      if (ctrlAction) {
        this.onKeybinding?.(ctrlAction)
        return ctrlAction
      }
    }

    const key = event.key
    const action = this.bindings[key]
    if (action) {
      this.onKeybinding?.(action)
      return action
    }

    return null
  }

  setPrefix(key: string): void {
    // Parse formats like 'C-a', 'C-b', 'Control+a'
    const parts = key.split(/[-+]/)
    if (parts.length === 2) {
      const modifier = parts[0]
      this.prefixKey = parts[1]
      if (modifier === 'C' || modifier === 'Control' || modifier === 'Ctrl') {
        this.prefixModifier = 'Control'
      } else if (modifier === 'M' || modifier === 'Meta') {
        this.prefixModifier = 'Meta'
      }
    }
  }

  bindKey(key: string, action: KeyAction): void {
    this.bindings[key] = action
  }

  unbindKey(key: string): void {
    delete this.bindings[key]
  }

  getState(): PrefixState {
    return this._state
  }

  getBindings(): KeyBindingMap {
    return { ...this.bindings }
  }

  getPrefixDisplay(): string {
    return `Ctrl+${this.prefixKey}`
  }

  destroy(): void {
    this.clearTimeout()
  }

  private isPrefixKey(event: KeyboardEvent): boolean {
    const hasModifier = this.prefixModifier === 'Control'
      ? event.ctrlKey
      : event.metaKey
    return hasModifier && event.key === this.prefixKey
  }

  private startTimeout(): void {
    this.clearTimeout()
    this.timeoutId = setTimeout(() => {
      this._state = 'idle'
      this.onPrefixTimeout?.()
    }, 2000)
  }

  private clearTimeout(): void {
    if (this.timeoutId !== null) {
      globalThis.clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
  }
}
