import { fail, ok } from './errors'
import type { Result } from './errors'

export type FlagKind = 'bool' | 'value'
export type FlagSpec = Readonly<Record<string, FlagKind>>
export type FlagValues = Readonly<Record<string, string | true>>

export interface ParsedArgs {
  readonly flags: FlagValues
  readonly positional: readonly string[]
}

interface Cluster {
  readonly flags: FlagValues
  /** How many following words the cluster used as a flag value (0 or 1). */
  readonly consumed: number
}

/** Reads one `-abc` word; a value flag takes the rest of the word or the next word. */
function readCluster(word: string, nextWord: string | undefined, spec: FlagSpec): Result<Cluster> {
  let flags: FlagValues = {}
  for (let i = 1; i < word.length; i++) {
    const flag = word[i]
    const kind = Object.hasOwn(spec, flag) ? spec[flag] : undefined
    if (!kind) return fail('parse.unknownFlag', { flag: `-${flag}` })
    if (kind === 'bool') {
      flags = { ...flags, [flag]: true }
      continue
    }
    const attached = word.slice(i + 1)
    if (attached) return ok({ flags: { ...flags, [flag]: attached }, consumed: 0 })
    if (nextWord === undefined) return fail('parse.missingArg', { flag: `-${flag}` })
    return ok({ flags: { ...flags, [flag]: nextWord }, consumed: 1 })
  }
  return ok({ flags, consumed: 0 })
}

/** getopt-style parsing: flags come first and stop at the first positional, a lone `-`, or `--`. */
export function parseArgs(words: readonly string[], spec: FlagSpec): Result<ParsedArgs> {
  let flags: FlagValues = {}
  let i = 0
  while (i < words.length) {
    const word = words[i]
    if (word === '--') {
      i++
      break
    }
    if (word.length < 2 || word[0] !== '-') break
    const cluster = readCluster(word, words[i + 1], spec)
    if (!cluster.ok) return cluster
    flags = { ...flags, ...cluster.value.flags }
    i += 1 + cluster.value.consumed
  }
  return ok({ flags, positional: words.slice(i) })
}

/** The value given to a value flag, or undefined when the flag was not used. */
export function flagValue(args: ParsedArgs, flag: string): string | undefined {
  const value = Object.hasOwn(args.flags, flag) ? args.flags[flag] : undefined
  return typeof value === 'string' ? value : undefined
}

export function hasFlag(args: ParsedArgs, flag: string): boolean {
  return Object.hasOwn(args.flags, flag)
}
