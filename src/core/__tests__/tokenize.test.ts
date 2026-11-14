import { describe, it, expect } from 'vitest'
import { tokenize, splitCommands, quoteWords } from '../tokenize'

function words(line: string): string[][] {
  const result = tokenize(line)
  if (!result.ok) throw new Error(`tokenize failed: ${result.error.code}`)
  return splitCommands(result.value)
}

describe('tokenize', () => {
  it('splits on whitespace', () => {
    expect(words('tmux  new -s   dev')).toEqual([['tmux', 'new', '-s', 'dev']])
  })

  it('returns no commands for blank input', () => {
    expect(words('   ')).toEqual([])
  })

  it('keeps single-quoted text literal', () => {
    expect(words(`send-keys 'npm run dev' Enter`)).toEqual([['send-keys', 'npm run dev', 'Enter']])
  })

  it('handles escapes inside double quotes', () => {
    expect(words(String.raw`display "say \"hi\" \\ ok"`)).toEqual([['display', String.raw`say "hi" \ ok`]])
  })

  it('joins adjacent quoted and bare parts into one word', () => {
    expect(words(`set status-right "#H "'%H:%M'`)).toEqual([['set', 'status-right', '#H %H:%M']])
  })

  it('keeps an empty quoted string as a word', () => {
    expect(words(`set -g status-left ''`)).toEqual([['set', '-g', 'status-left', '']])
  })

  it('treats a backslash outside quotes as an escape', () => {
    expect(words(String.raw`bind \\ split-window -h`)).toEqual([['bind', '\\', 'split-window', '-h']])
  })

  it('splits commands on a bare semicolon', () => {
    expect(words('new-window ; split-window -h')).toEqual([['new-window'], ['split-window', '-h']])
  })

  it('splits on a semicolon attached to a word', () => {
    expect(words('new-window; split-window')).toEqual([['new-window'], ['split-window']])
  })

  it('keeps an escaped semicolon as a word', () => {
    expect(words(String.raw`bind r source-file ~/.tmux.conf \; display done`))
      .toEqual([['bind', 'r', 'source-file', '~/.tmux.conf', ';', 'display', 'done']])
  })

  it('does not split on a semicolon inside quotes', () => {
    expect(words(`display 'a ; b'`)).toEqual([['display', 'a ; b']])
  })

  it('drops comments', () => {
    expect(words('set -g mouse on # enable mouse')).toEqual([['set', '-g', 'mouse', 'on']])
    expect(words('# just a comment')).toEqual([])
  })

  it('keeps a hash inside quotes or inside a word', () => {
    expect(words(`set status-left '#S'`)).toEqual([['set', 'status-left', '#S']])
    expect(words('echo a#b')).toEqual([['echo', 'a#b']])
  })

  it('reports an unterminated quote', () => {
    const result = tokenize(`send-keys 'npm run dev`)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('parse.unterminatedQuote')
  })
})

describe('quoteWords', () => {
  it('round-trips words through tokenize', () => {
    const original = ['send-keys', 'npm run dev', '', "it's", 'a"b', '#S', '~/x', '%%']
    expect(words(quoteWords(original))).toEqual([original])
  })

  it('writes a semicolon word bare so it separates commands when run', () => {
    const line = quoteWords(['source-file', '~/.tmux.conf', ';', 'display', 'done'])
    expect(words(line)).toEqual([['source-file', '~/.tmux.conf'], ['display', 'done']])
  })

  it('leaves plain words unquoted', () => {
    expect(quoteWords(['split-window', '-h', '-t', 'dev:editor.1'])).toBe('split-window -h -t dev:editor.1')
  })
})

describe('quoted words', () => {
  function quotedFlags(line: string): boolean[] {
    const result = tokenize(line)
    if (!result.ok) throw new Error(`tokenize failed: ${result.error.code}`)
    return result.value.map(token => token.quoted)
  }

  it('marks a word with a quoted or escaped part', () => {
    expect(quotedFlags(String.raw`bind '|' "a b" \| x'y'z`)).toEqual([false, true, true, true, true])
  })

  it('leaves bare words and separators unmarked', () => {
    expect(quotedFlags('bind | split-window ; next')).toEqual([false, false, false, false, false])
  })

  it('does not carry the mark over to the next word', () => {
    expect(quotedFlags(`'a' b;'c' d`)).toEqual([true, false, false, true, false])
  })
})
