import { describe, it, expect } from 'vitest'
import { closestWord } from '../suggest'

const WORDS = ['tmux', 'ls', 'new', 'neww', 'split-window']

describe('closestWord', () => {
  it('finds a word one edit away', () => {
    expect(closestWord('tmx', WORDS)).toBe('tmux')
    expect(closestWord('split-windo', WORDS)).toBe('split-window')
  })

  it('finds two swapped letters', () => {
    expect(closestWord('tmxu', WORDS)).toBe('tmux')
  })

  it('ignores case', () => {
    expect(closestWord('TMUX', WORDS)).toBe('tmux')
  })

  it('prefers the closer word', () => {
    expect(closestWord('neww2', WORDS)).toBe('neww')
  })

  it('keeps the earlier word on a tie', () => {
    expect(closestWord('nwe', WORDS)).toBe('new')
  })

  it('allows up to three edits in a long word', () => {
    expect(closestWord('splt-wndw', WORDS)).toBe('split-window')
    expect(closestWord('spt-wndw', WORDS)).toBeUndefined()
  })

  it('does not match short unrelated input', () => {
    expect(closestWord('ab', WORDS)).toBeUndefined()
    expect(closestWord('xyz', WORDS)).toBeUndefined()
  })

  it('returns undefined when there are no words', () => {
    expect(closestWord('tmux', [])).toBeUndefined()
  })
})
