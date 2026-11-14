import { fail, ok } from './errors'
import type { Result } from './errors'

export interface Token {
  readonly text: string
  /** True for an unquoted `;`, which ends one command and starts the next. */
  readonly separator: boolean
  /** True when any part of the word was quoted or backslash-escaped, so a shell must not read it as an operator. */
  readonly quoted: boolean
}

const SEPARATOR: Token = { text: ';', separator: true, quoted: false }
const PLAIN_WORD = /^[\w\-+=:.,/@%~^!?[\]{}|&*$]+$/
const DOUBLE_QUOTE_ESCAPES = '"\\$'

interface Scan {
  readonly tokens: readonly Token[]
  /** The word being built; null between words, so `''` still yields an empty word. */
  readonly word: string | null
  readonly quoted: boolean
}

function endWord(scan: Scan): Scan {
  if (scan.word === null) return scan
  return { tokens: [...scan.tokens, { text: scan.word, separator: false, quoted: scan.quoted }], word: null, quoted: false }
}

function append(scan: Scan, text: string, quoted = false): Scan {
  return { tokens: scan.tokens, word: (scan.word ?? '') + text, quoted: scan.quoted || quoted }
}

/** Reads a quoted section starting after the opening quote; null when the quote never closes. */
function readQuoted(line: string, start: number, quote: string): { text: string; next: number } | null {
  let text = ''
  for (let i = start; i < line.length; i++) {
    const ch = line[i]
    if (ch === quote) return { text, next: i + 1 }
    if (quote === '"' && ch === '\\' && DOUBLE_QUOTE_ESCAPES.includes(line[i + 1] ?? '')) {
      text += line[++i]
    } else {
      text += ch
    }
  }
  return null
}

/** Splits a command line into words the way tmux does: quotes, backslash escapes, `;` separators and `#` comments. */
export function tokenize(line: string): Result<Token[]> {
  let scan: Scan = { tokens: [], word: null, quoted: false }
  let i = 0
  while (i < line.length) {
    const ch = line[i]
    if (ch === ' ' || ch === '\t') {
      scan = endWord(scan)
      i++
    } else if (ch === ';') {
      scan = { tokens: [...endWord(scan).tokens, SEPARATOR], word: null, quoted: false }
      i++
    } else if (ch === '#' && scan.word === null) {
      break
    } else if (ch === "'" || ch === '"') {
      const quoted = readQuoted(line, i + 1, ch)
      if (!quoted) return fail('parse.unterminatedQuote')
      scan = append(scan, quoted.text, true)
      i = quoted.next
    } else if (ch === '\\' && i + 1 < line.length) {
      scan = append(scan, line[i + 1], true)
      i += 2
    } else {
      scan = append(scan, ch)
      i++
    }
  }
  return ok([...endWord(scan).tokens])
}

/** Groups tokens into one word list per command, dropping empty commands. */
export function splitCommands(tokens: readonly Token[]): string[][] {
  const commands: string[][] = [[]]
  for (const token of tokens) {
    if (token.separator) commands.push([])
    else commands[commands.length - 1].push(token.text)
  }
  return commands.filter(words => words.length > 0)
}

function quoteWord(word: string): string {
  // A `;` word is written bare so that a stored binding splits into commands when it runs.
  if (word === ';' || PLAIN_WORD.test(word)) return word
  if (!word.includes("'")) return `'${word}'`
  const escaped = word.replace(/["\\$]/g, ch => `\\${ch}`)
  return `"${escaped}"`
}

/** Joins words back into a line that `tokenize` reads as the same words. */
export function quoteWords(words: readonly string[]): string {
  return words.map(quoteWord).join(' ')
}
