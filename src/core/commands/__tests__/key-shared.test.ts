import { describe, it, expect } from 'vitest'
import { bindableKey, readKey } from '../key-shared'

describe('readKey', () => {
  it('returns the canonical key', () => {
    expect(readKey('c-A')).toEqual({ ok: true, value: 'C-a' })
  })

  it('reports the word as typed when it is not a key', () => {
    expect(readKey('Ctrl+x')).toEqual({ ok: false, error: { code: 'key.invalid', params: { key: 'Ctrl+x' } } })
  })

  it('accepts reserved keys', () => {
    expect(readKey('c-W')).toEqual({ ok: true, value: 'C-w' })
  })
})

describe('bindableKey', () => {
  it('returns the canonical key', () => {
    expect(bindableKey('^a')).toEqual({ ok: true, value: 'C-a' })
  })

  it('reports the word as typed when it is not a key', () => {
    expect(bindableKey('Ctrl+x')).toEqual({ ok: false, error: { code: 'key.invalid', params: { key: 'Ctrl+x' } } })
  })

  it('rejects reserved keys by their canonical name', () => {
    expect(bindableKey('c-T')).toEqual({ ok: false, error: { code: 'key.reserved', params: { key: 'C-t' } } })
  })
})
