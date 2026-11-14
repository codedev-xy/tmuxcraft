import type { KeyId, KeyTable } from './types'

export const DEFAULT_PREFIX: KeyId = 'C-b'

/** Keys the browser never lets a page intercept, so they cannot work as a prefix. */
export const RESERVED_KEYS: readonly KeyId[] = ['C-w', 'C-t', 'C-n']

const NAMED_KEYS: Readonly<Record<string, string>> = {
  up: 'Up', down: 'Down', left: 'Left', right: 'Right',
  enter: 'Enter', escape: 'Escape', space: 'Space', tab: 'Tab', bspace: 'BSpace',
  home: 'Home', end: 'End', pageup: 'PageUp', ppage: 'PageUp', pagedown: 'PageDown', npage: 'PageDown',
}

const EVENT_KEYS: Readonly<Record<string, string>> = {
  ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
  Enter: 'Enter', Escape: 'Escape', ' ': 'Space', Tab: 'Tab', Backspace: 'BSpace',
  Home: 'Home', End: 'End', PageUp: 'PageUp', PageDown: 'PageDown',
}

const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Dead', 'Process'])

const DISPLAY_NAMES: Readonly<Record<string, string>> = {
  Up: '↑', Down: '↓', Left: '←', Right: '→', BSpace: 'Backspace', Escape: 'Esc',
}

function withModifiers(base: string, ctrl: boolean, meta: boolean, shift: boolean): KeyId {
  return `${ctrl ? 'C-' : ''}${meta ? 'M-' : ''}${shift ? 'S-' : ''}${base}`
}

/** Canonical form of a key written in tmux notation (`c-A` becomes `C-a`); null when it is not a key. */
export function normalizeKey(input: string): KeyId | null {
  let rest = input
  let ctrl = false
  let meta = false
  let shift = false
  if (rest.length === 2 && rest[0] === '^') {
    ctrl = true
    rest = rest[1]
  }
  while (rest.length > 2 && rest[1] === '-') {
    const modifier = rest[0].toUpperCase()
    if (modifier === 'C') ctrl = true
    else if (modifier === 'M') meta = true
    else if (modifier === 'S') shift = true
    else return null
    rest = rest.slice(2)
  }
  if (rest.length === 1) {
    if (rest === ' ') return withModifiers('Space', ctrl, meta, shift)
    return withModifiers(ctrl ? rest.toLowerCase() : rest, ctrl, meta, shift)
  }
  const named = NAMED_KEYS[rest.toLowerCase()]
  return named ? withModifiers(named, ctrl, meta, shift) : null
}

export interface KeyPress {
  readonly key: string
  readonly ctrlKey?: boolean
  readonly altKey?: boolean
  readonly shiftKey?: boolean
  readonly metaKey?: boolean
}

/** Translates a browser keydown into tmux notation; null for bare modifiers and Cmd/Win shortcuts. */
export function keyFromEvent(event: KeyPress): KeyId | null {
  if (event.metaKey || MODIFIER_KEYS.has(event.key)) return null
  const ctrl = event.ctrlKey === true
  const meta = event.altKey === true
  const named = EVENT_KEYS[event.key]
  if (named) return withModifiers(named, ctrl, meta, event.shiftKey === true)
  if (event.key.length !== 1) return null
  // Shift is already part of a printable character ("%" is not "S-5").
  return withModifiers(ctrl ? event.key.toLowerCase() : event.key, ctrl, meta, false)
}

/** Human-readable form for the UI: `C-b` becomes `Ctrl+b`, `M-Left` becomes `Alt+←`. */
export function displayKey(key: KeyId): string {
  const parts: string[] = []
  let rest = key
  while (rest.length > 2 && rest[1] === '-' && 'CMS'.includes(rest[0])) {
    parts.push(rest[0] === 'C' ? 'Ctrl' : rest[0] === 'M' ? 'Alt' : 'Shift')
    rest = rest.slice(2)
  }
  return [...parts, DISPLAY_NAMES[rest] ?? rest].join('+')
}

function windowBindings(): Record<KeyId, string> {
  return Object.fromEntries(Array.from({ length: 10 }, (_, i) => [String(i), `select-window -t :${i}`]))
}

export const DEFAULT_PREFIX_BINDINGS: KeyTable = {
  'C-b': 'send-prefix',
  '"': 'split-window',
  '%': 'split-window -h',
  c: 'new-window',
  n: 'next-window',
  p: 'previous-window',
  ...windowBindings(),
  ',': "command-prompt -I '#W' \"rename-window '%%'\"",
  $: "command-prompt -I '#S' \"rename-session '%%'\"",
  ':': 'command-prompt',
  '&': 'confirm-before -p "kill-window #W? (y/n)" kill-window',
  x: 'confirm-before -p "kill-pane #P? (y/n)" kill-pane',
  z: 'resize-pane -Z',
  d: 'detach-client',
  '{': 'swap-pane -U',
  '}': 'swap-pane -D',
  '!': 'break-pane',
  o: 'select-pane -t :.+',
  Space: 'next-layout',
  '[': 'copy-mode',
  ']': 'paste-buffer',
  s: 'choose-tree -s',
  w: 'choose-tree -w',
  '?': 'list-keys',
  Up: 'select-pane -U',
  Down: 'select-pane -D',
  Left: 'select-pane -L',
  Right: 'select-pane -R',
  'C-Up': 'resize-pane -U',
  'C-Down': 'resize-pane -D',
  'C-Left': 'resize-pane -L',
  'C-Right': 'resize-pane -R',
  'M-Up': 'resize-pane -U 5',
  'M-Down': 'resize-pane -D 5',
  'M-Left': 'resize-pane -L 5',
  'M-Right': 'resize-pane -R 5',
}
