import { describe, it, expect } from 'vitest'
import { flagValue, hasFlag, parseArgs } from '../argparse'
import type { FlagSpec } from '../argparse'

const SPEC: FlagSpec = { d: 'bool', h: 'bool', v: 'bool', s: 'value', t: 'value', n: 'value' }

function parse(words: string[], spec: FlagSpec = SPEC) {
  const result = parseArgs(words, spec)
  if (!result.ok) throw new Error(`parseArgs failed: ${result.error.code}`)
  return result.value
}

function errorOf(words: string[], spec: FlagSpec = SPEC) {
  const result = parseArgs(words, spec)
  if (result.ok) throw new Error('expected a parse error')
  return result.error
}

describe('parseArgs', () => {
  it('returns empty flags and positionals for no words', () => {
    expect(parse([])).toEqual({ flags: {}, positional: [] })
  })

  it('reads boolean and value flags', () => {
    expect(parse(['-d', '-s', 'dev'])).toEqual({ flags: { d: true, s: 'dev' }, positional: [] })
  })

  it('reads clustered flags, with a value flag last', () => {
    expect(parse(['-dhs', 'dev'])).toEqual({ flags: { d: true, h: true, s: 'dev' }, positional: [] })
  })

  it('reads a value attached to its flag', () => {
    expect(parse(['-sdev', '-t:1'])).toEqual({ flags: { s: 'dev', t: ':1' }, positional: [] })
  })

  it('stops reading flags at the first positional', () => {
    const args = parse(['x', 'split-window', '-h'], { n: 'bool', r: 'bool' })
    expect(args).toEqual({ flags: {}, positional: ['x', 'split-window', '-h'] })
  })

  it('treats a lone dash as a positional', () => {
    const args = parse(['-', 'split-window', '-v'], { n: 'bool' })
    expect(args.positional).toEqual(['-', 'split-window', '-v'])
  })

  it('stops reading flags at a double dash', () => {
    expect(parse(['-d', '--', '-s'])).toEqual({ flags: { d: true }, positional: ['-s'] })
  })

  it('keeps an empty-string value', () => {
    expect(parse(['-n', ''])).toEqual({ flags: { n: '' }, positional: [] })
  })

  it('reports an unknown flag', () => {
    expect(errorOf(['-x'])).toEqual({ code: 'parse.unknownFlag', params: { flag: '-x' } })
  })

  it('reports a value flag with no value', () => {
    expect(errorOf(['-d', '-s'])).toEqual({ code: 'parse.missingArg', params: { flag: '-s' } })
  })
})

describe('flagValue and hasFlag', () => {
  const args = parse(['-d', '-t', 'dev:1', 'rest'])

  it('reads the value of a value flag', () => {
    expect(flagValue(args, 't')).toBe('dev:1')
  })

  it('gives undefined for a flag that was not used, a boolean flag, or an inherited key', () => {
    expect(flagValue(args, 's')).toBeUndefined()
    expect(flagValue(args, 'd')).toBeUndefined()
    expect(flagValue(args, 'constructor')).toBeUndefined()
  })

  it('tells whether a flag was used', () => {
    expect(hasFlag(args, 'd')).toBe(true)
    expect(hasFlag(args, 't')).toBe(true)
    expect(hasFlag(args, 'h')).toBe(false)
    expect(hasFlag(args, 'constructor')).toBe(false)
  })
})
