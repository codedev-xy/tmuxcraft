import { describe, it, expect } from 'vitest'
import { getOption, isOn, OPTIONS } from '../options'
import { normalizeKey } from '../keymap'
import { emptyState } from '../state'

describe('getOption', () => {
  it('falls back to the tmux default', () => {
    expect(getOption(emptyState(), 'prefix')).toBe('C-b')
    expect(getOption(emptyState(), 'mouse')).toBe('off')
    expect(getOption(emptyState(), 'status')).toBe('on')
  })

  it('returns a value that was set', () => {
    const state = { ...emptyState(), options: { prefix: 'C-a', mouse: 'on' } }
    expect(getOption(state, 'prefix')).toBe('C-a')
    expect(getOption(state, 'mouse')).toBe('on')
  })
})

describe('isOn', () => {
  it('reads a flag option', () => {
    expect(isOn(emptyState(), 'mouse')).toBe(false)
    expect(isOn({ ...emptyState(), options: { mouse: 'on' } }, 'mouse')).toBe(true)
  })
})

describe('OPTIONS', () => {
  it('gives every choice option a default that is one of its choices', () => {
    for (const spec of Object.values(OPTIONS)) {
      if (spec.kind === 'choice') expect(spec.choices).toContain(spec.default)
      if (spec.kind === 'flag') expect(['on', 'off']).toContain(spec.default)
      if (spec.kind === 'key') expect(normalizeKey(spec.default)).toBe(spec.default)
    }
  })
})
