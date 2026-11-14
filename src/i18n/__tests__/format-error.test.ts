import { describe, it, expect } from 'vitest'
import { createInstance } from 'i18next'
import type { TFunction } from 'i18next'
import { ERROR_CODES } from '@/core/errors'
import type { TmuxError } from '@/core/errors'
import { ENGINE } from '@/core/engine'
import { submitLine } from '@/core/shell'
import { defaultState, emptyState } from '@/core/state'
import type { TmuxState } from '@/core/types'
import { formatError } from '../format-error'
import zh from '../zh.json'
import en from '../en.json'

type Tree = { readonly [key: string]: string | Tree }

const LANGS = ['zh', 'en'] as const
type Lang = typeof LANGS[number]
const TREES: Readonly<Record<Lang, Tree>> = { zh: zh.errors as Tree, en: en.errors as Tree }

// Escaping deliberately left at the i18next default (on) to prove formatError turns it off.
async function makeT(lng: Lang): Promise<TFunction> {
  const instance = createInstance()
  await instance.init({
    lng,
    fallbackLng: false,
    showSupportNotice: false,
    resources: { zh: { translation: zh }, en: { translation: en } },
  })
  return instance.t
}

const T = {
  zh: await makeT('zh'),
  en: await makeT('en'),
} as const

function leafPaths(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string' ? [prefix + key] : leafPaths(value, `${prefix}${key}.`))
}

function lookup(tree: Tree, path: string): string | undefined {
  const value = path.split('.').reduce<string | Tree | undefined>(
    (node, key) => (node !== undefined && typeof node !== 'string' ? node[key] : undefined), tree)
  return typeof value === 'string' ? value : undefined
}

function placeholders(text: string): string[] {
  return [...new Set([...text.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map(match => match[1]))].sort()
}

describe('errors translations', () => {
  it.each(LANGS)('%s has a non-empty message for every error code', lang => {
    for (const code of ERROR_CODES) {
      const message = lookup(TREES[lang], code)
      expect(message, code).toBeTypeOf('string')
      expect(message?.trim(), code).not.toBe('')
      expect(T[lang](`errors.${code}`), code).not.toBe(`errors.${code}`)
    }
  })

  it('zh and en use the same placeholders for every code', () => {
    for (const code of [...ERROR_CODES, 'didYouMean']) {
      const zhText = lookup(TREES.zh, code) ?? ''
      const enText = lookup(TREES.en, code) ?? ''
      expect(placeholders(zhText), code).toEqual(placeholders(enText))
    }
  })

  it('zh and en have the same keys, and only error codes plus didYouMean', () => {
    const allowed = [...ERROR_CODES, 'didYouMean'].sort()
    expect(leafPaths(TREES.zh).sort()).toEqual(allowed)
    expect(leafPaths(TREES.en).sort()).toEqual(allowed)
  })

  it('no error code group is named didYouMean', () => {
    expect(ERROR_CODES.some(code => code.split('.')[0] === 'didYouMean')).toBe(false)
  })
})

describe('formatError', () => {
  const notFound: TmuxError = { code: 'target.windowNotFound', params: { target: '99' } }

  it('interpolates params', () => {
    expect(formatError(T.en, notFound)).toContain('99')
    expect(formatError(T.zh, notFound)).toContain('99')
    expect(formatError(T.en, notFound)).not.toContain('{{')
  })

  it.each(LANGS)('%s: prefixes path:line when the error has a location', lang => {
    const error: TmuxError = { ...notFound, at: { path: '~/.tmux.conf', line: 3 } }
    const plain = formatError(T[lang], notFound)
    expect(formatError(T[lang], error)).toBe(`~/.tmux.conf:3: ${plain}`)
  })

  it.each(LANGS)('%s: appends did-you-mean when the error has a suggestion', lang => {
    const error: TmuxError = { code: 'parse.unknownCommand', params: { command: 'atach' }, suggestion: 'attach' }
    const text = formatError(T[lang], error)
    expect(text.startsWith(formatError(T[lang], { code: 'parse.unknownCommand', params: { command: 'atach' } }))).toBe(true)
    expect(text).toContain('attach')
    expect(text).toContain(T[lang]('errors.didYouMean', { command: 'attach' }))
  })

  it.each(LANGS)('%s: combines location prefix and suggestion suffix', lang => {
    const error: TmuxError = {
      code: 'parse.unknownCommand',
      params: { command: 'splt-window' },
      suggestion: 'split-window',
      at: { path: '~/.tmux.conf', line: 7 },
    }
    const text = formatError(T[lang], error)
    expect(text.startsWith('~/.tmux.conf:7: ')).toBe(true)
    expect(text).toContain('splt-window')
    expect(text.endsWith(T[lang]('errors.didYouMean', { command: 'split-window' }))).toBe(true)
  })

  it.each(LANGS)('%s: does not HTML-escape user text', lang => {
    const name = '"a<b&c"'
    const text = formatError(T[lang], { code: 'target.sessionNotFound', params: { target: name } })
    expect(text).toContain(name)
    expect(text).not.toMatch(/&(quot|lt|amp|#\d+);/)
    const at = formatError(T[lang], { ...notFound, at: { path: '~/a&b.conf', line: 1 } })
    expect(at.startsWith('~/a&b.conf:1: ')).toBe(true)
  })
})

describe('formatError on errors produced by the core', () => {
  const detached: TmuxState = { ...defaultState(), isDetached: true }
  const cases: ReadonlyArray<readonly [string, TmuxState, string, TmuxError['code']]> = [
    ['unknown tmux command', defaultState(), 'tmux atach', 'parse.unknownCommand'],
    ['unknown shell command', defaultState(), 'hello', 'shell.commandNotFound'],
    ['missing window', defaultState(), ':select-window -t 99', 'target.windowNotFound'],
    ['break a lone pane', defaultState(), ':break-pane', 'pane.onlyOne'],
    ['nested session', defaultState(), 'tmux new -s x', 'session.nested'],
    ['no server', emptyState(), 'tmux ls', 'session.none'],
    ['pipe', defaultState(), 'echo a | cat', 'shell.unsupported'],
    ['join-pane without -s', defaultState(), ':join-pane', 'parse.missingArg'],
    ['missing file', defaultState(), 'cat nope.txt', 'file.notFound'],
    ['unknown flag', defaultState(), ':split-window -Q', 'parse.unknownFlag'],
    ['duplicate session', detached, 'tmux new -d -s 0', 'session.duplicate'],
    ['unknown option', defaultState(), ':set -g nope on', 'option.unknown'],
    ['unknown layout', defaultState(), ':select-layout nope', 'layout.unknown'],
    ['missing operand', defaultState(), 'cat', 'shell.missingOperand'],
    ['empty buffer', defaultState(), ':paste-buffer', 'buffer.empty'],
  ]

  it.each(cases)('%s', (_name, state, line, code) => {
    const result = submitLine(state, line, ENGINE)
    expect(result.errors.length).toBeGreaterThan(0)
    const error = result.errors[0]
    expect(error.code).toBe(code)
    for (const lang of LANGS) {
      const text = formatError(T[lang], error)
      expect(text, `${lang}: ${text}`).not.toContain('{{')
      expect(text).not.toContain('errors.')
      for (const value of Object.values(error.params ?? {})) expect(text).toContain(String(value))
    }
  })

  it('suggests a command for a typo', () => {
    const error = submitLine(defaultState(), 'tmux atach', ENGINE).errors[0]
    expect(error.suggestion).toBeDefined()
    expect(formatError(T.en, error)).toContain(String(error.suggestion))
  })
})
