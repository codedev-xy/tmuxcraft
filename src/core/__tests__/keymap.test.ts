import { describe, it, expect } from 'vitest'
import { normalizeKey, keyFromEvent, displayKey, DEFAULT_PREFIX_BINDINGS, RESERVED_KEYS } from '../keymap'

describe('normalizeKey', () => {
  it.each([
    ['C-a', 'C-a'],
    ['c-A', 'C-a'],
    ['^b', 'C-b'],
    ['M-Left', 'M-Left'],
    ['m-left', 'M-Left'],
    ['C-M-x', 'C-M-x'],
    ['S-Up', 'S-Up'],
    ['|', '|'],
    ['-', '-'],
    ['r', 'r'],
    ['R', 'R'],
    ['space', 'Space'],
    [' ', 'Space'],
    ['enter', 'Enter'],
    ['PPage', 'PageUp'],
    ['%', '%'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeKey(input)).toBe(expected)
  })

  it.each(['', 'foo', 'X-a', 'C-', 'C-foo'])('rejects %j', input => {
    expect(normalizeKey(input)).toBeNull()
  })
})

describe('keyFromEvent', () => {
  it('maps a ctrl chord', () => {
    expect(keyFromEvent({ key: 'b', ctrlKey: true })).toBe('C-b')
    expect(keyFromEvent({ key: 'A', ctrlKey: true, shiftKey: true })).toBe('C-a')
  })

  it('keeps shifted printable characters as the character itself', () => {
    expect(keyFromEvent({ key: '%', shiftKey: true })).toBe('%')
    expect(keyFromEvent({ key: '"', shiftKey: true })).toBe('"')
    expect(keyFromEvent({ key: '|', shiftKey: true })).toBe('|')
  })

  it('maps arrows and named keys', () => {
    expect(keyFromEvent({ key: 'ArrowLeft' })).toBe('Left')
    expect(keyFromEvent({ key: 'ArrowUp', ctrlKey: true })).toBe('C-Up')
    expect(keyFromEvent({ key: 'ArrowRight', altKey: true })).toBe('M-Right')
    expect(keyFromEvent({ key: ' ' })).toBe('Space')
    expect(keyFromEvent({ key: 'Enter' })).toBe('Enter')
    expect(keyFromEvent({ key: 'Escape' })).toBe('Escape')
  })

  it('ignores bare modifiers, Cmd shortcuts and unknown keys', () => {
    expect(keyFromEvent({ key: 'Shift', shiftKey: true })).toBeNull()
    expect(keyFromEvent({ key: 'Control', ctrlKey: true })).toBeNull()
    expect(keyFromEvent({ key: 'c', metaKey: true })).toBeNull()
    expect(keyFromEvent({ key: 'F5' })).toBeNull()
  })
})

describe('displayKey', () => {
  it.each([
    ['C-b', 'Ctrl+b'],
    ['M-Left', 'Alt+←'],
    ['C-Up', 'Ctrl+↑'],
    ['%', '%'],
    ['-', '-'],
    ['Space', 'Space'],
  ])('shows %s as %s', (key, expected) => {
    expect(displayKey(key)).toBe(expected)
  })
})

describe('default bindings', () => {
  it('uses canonical key names', () => {
    for (const key of Object.keys(DEFAULT_PREFIX_BINDINGS)) {
      expect(normalizeKey(key)).toBe(key)
    }
  })

  it('binds the keys the game teaches', () => {
    expect(DEFAULT_PREFIX_BINDINGS['%']).toBe('split-window -h')
    expect(DEFAULT_PREFIX_BINDINGS['"']).toBe('split-window')
    expect(DEFAULT_PREFIX_BINDINGS['2']).toBe('select-window -t :2')
    expect(DEFAULT_PREFIX_BINDINGS.Space).toBe('next-layout')
  })

  it('lists reserved browser keys in canonical form', () => {
    for (const key of RESERVED_KEYS) expect(normalizeKey(key)).toBe(key)
  })
})
