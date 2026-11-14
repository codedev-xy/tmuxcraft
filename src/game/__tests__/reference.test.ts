import { describe, expect, it } from 'vitest'
import type { TmuxState } from '@/core/types'
import en from '@/i18n/en.json'
import zh from '@/i18n/zh.json'
import { makeSession, makeState, makeWindow, paneNode, singlePaneState, split } from '@/game/levels/helpers'
import { REFERENCE, REFERENCE_ENTRIES, entryInputs, entryText, filterReference } from '@/game/reference'
import { keys, line, prompt, save } from '@/game/sim/inputs'
import type { PlayerInput } from '@/game/sim/simulate'
import { simulate } from '@/game/sim/simulate'

interface Fixture {
  readonly start?: TmuxState
  /** What has to happen before the entry can run. */
  readonly before?: readonly PlayerInput[]
  /** What the entry asks for next (a name in a prompt, `y` to a question). */
  readonly after?: readonly PlayerInput[]
}

const TEXT = ['one', 'two', 'three']

const oneWindow = (layout: Parameters<typeof makeWindow>[2], active: string) =>
  makeState([makeSession('s1', '0', [makeWindow('w1', 'main', layout, active)])], 's1')

const TWO_PANES = oneWindow(split('horizontal', paneNode('p1', TEXT), paneNode('p2', TEXT)), 'p1')
const GRID = oneWindow(split('vertical',
  split('horizontal', paneNode('p1', TEXT), paneNode('p2', TEXT)),
  split('horizontal', paneNode('p3', TEXT), paneNode('p4', TEXT)),
), 'p4')
const TWO_WINDOWS = makeState([makeSession('s1', '0', [
  makeWindow('w1', 'editor', paneNode('p1'), 'p1'),
  makeWindow('w2', 'server', paneNode('p2'), 'p2'),
])], 's1')
const TWO_SESSIONS = makeState([
  makeSession('s1', 'project', [makeWindow('w1', 'main', paneNode('p1'), 'p1')]),
  makeSession('s2', 'dev', [makeWindow('w2', 'tools', paneNode('p2'), 'p2')]),
], 's1')
const TEMP_WINDOW = makeState([makeSession('s1', '0', [
  makeWindow('w1', 'main', paneNode('p1', TEXT), 'p1'),
  makeWindow('w2', 'temp', paneNode('p2', TEXT), 'p2'),
])], 's1')
const DETACHED = makeState([], '', true)
const DETACHED_WORK = makeState([makeSession('s1', 'work', [makeWindow('w1', 'bash', paneNode('p1'), 'p1')])], 's1', true)
const IN_COPY_MODE = keys('C-b', '[')

const FIXTURES: Readonly<Record<string, Fixture>> = {
  'new-session': { start: DETACHED },
  'attach': { start: DETACHED_WORK },
  'switch-client': { start: TWO_SESSIONS },
  'kill-session': { start: TWO_SESSIONS },
  'rename-session': { after: [prompt('work')] },
  'next-window': { start: TWO_WINDOWS },
  'previous-window': { start: TWO_WINDOWS },
  'select-window': { start: TWO_WINDOWS },
  'rename-window': { after: [prompt('editor')] },
  'kill-window': { start: TWO_WINDOWS, after: [prompt('y')] },
  'move-window': { start: makeState([
    makeSession('s1', 'project', [makeWindow('w1', 'main', paneNode('p1'), 'p1')]),
    makeSession('s2', 'utils', [makeWindow('w2', 'tools', paneNode('p2'), 'p2')]),
  ], 's1') },
  'select-pane': { start: GRID },
  'next-pane': { start: TWO_PANES },
  'kill-pane': { start: TWO_PANES, after: [prompt('y')] },
  'zoom-pane': { start: TWO_PANES },
  'resize-pane': { start: GRID },
  'resize-pane-5': { start: GRID },
  'swap-pane': { start: TWO_PANES },
  'break-pane': { start: TWO_PANES },
  'join-pane': { start: TEMP_WINDOW },
  'next-layout': { start: TWO_PANES },
  'select-layout': { start: TWO_PANES },
  'synchronize-panes': { start: TWO_PANES },
  'copy-mode': { start: TWO_PANES },
  'copy-move': { start: TWO_PANES, before: [...IN_COPY_MODE, ...keys('Up', 'Right')] },
  'copy-select': { start: TWO_PANES, before: IN_COPY_MODE },
  'copy-copy': { start: TWO_PANES, before: [...IN_COPY_MODE, ...keys('Space', '$')] },
  'copy-quit': { start: TWO_PANES, before: IN_COPY_MODE },
  'paste': { start: TWO_PANES, before: [...IN_COPY_MODE, ...keys('Space', '$', 'Enter', 'C-b', 'Right')] },
  'command-prompt': { after: [prompt('split-window -h')] },
  'source-file': { before: [save('~/.tmux.conf', 'set -g mouse on\n')] },
  'run-script': { start: DETACHED, before: [save('~/dev.sh', 'tmux new-session -d -s dev\ntmux attach -t dev\n')] },
}

const lookup = (tree: unknown, key: string): unknown =>
  key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], tree)

describe('the command reference', () => {
  it('has unique entry ids', () => {
    const ids = REFERENCE_ENTRIES.map(entry => entry.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('lists the five categories, none of them empty', () => {
    expect(REFERENCE.map(category => category.id)).toEqual(['session', 'window', 'pane', 'copy', 'config'])
    REFERENCE.forEach(category => expect(category.entries.length).toBeGreaterThan(0))
  })

  it('has a fixture only for entries that exist', () => {
    const ids = new Set(REFERENCE_ENTRIES.map(entry => entry.id))
    expect(Object.keys(FIXTURES).filter(id => !ids.has(id))).toEqual([])
  })

  it.each(REFERENCE_ENTRIES.map(entry => [entry.id, entry] as const))('%s runs without errors', (_id, entry) => {
    const fixture = FIXTURES[entry.id] ?? {}
    for (const inputs of entryInputs(entry)) {
      const ready = simulate(fixture.start ?? singlePaneState(), fixture.before ?? [])
      expect(ready.results.flatMap(result => result.errors)).toEqual([])
      const ran = simulate(ready.state, [...inputs, ...(fixture.after ?? [])])
      expect(ran.results.flatMap(result => result.errors)).toEqual([])
      expect(ran.results.slice(0, inputs.length).every(result => result.handled)).toBe(true)
      expect(ran.state).not.toEqual(ready.state)
    }
  })

  it.each([['zh', zh], ['en', en]] as const)('has every text in %s', (_lang, texts) => {
    const keys = [
      ...REFERENCE.flatMap(category => [`reference.categories.${category.id}`, `reference.descriptions.${category.id}`]),
      ...REFERENCE_ENTRIES.map(entry => `reference.entries.${entry.id}`),
    ]
    expect(keys.filter(key => typeof lookup(texts, key) !== 'string')).toEqual([])
  })

  it('shows keys the way the game writes them', () => {
    const find = (id: string) => REFERENCE_ENTRIES.find(entry => entry.id === id)!
    expect(entryText(find('split-side'))).toBe('Ctrl+b %')
    expect(entryText(find('split-stacked'))).toBe('Ctrl+b "')
    expect(entryText(find('resize-pane-5'))).toBe('Ctrl+b Alt+↑/Alt+↓/Alt+←/Alt+→')
    expect(entryText(find('new-session'))).toBe('tmux new -s work')
  })

  it('turns a typed entry into one line, and a keys entry into one sequence per choice', () => {
    const find = (id: string) => REFERENCE_ENTRIES.find(entry => entry.id === id)!
    expect(entryInputs(find('select-layout'))).toEqual([[line(':select-layout even-horizontal')]])
    expect(entryInputs(find('swap-pane'))).toEqual([keys('C-b', '{'), keys('C-b', '}')])
  })

  it('finds a key by the tmux command it runs', () => {
    const found = (query: string) => filterReference(query, () => '').flatMap(category => category.entries.map(entry => entry.id))
    expect(found('split-window')).toEqual(['split-side', 'split-stacked', 'bind-key'])
    expect(found('kill-pane')).toEqual(['kill-pane'])
    expect(found('resize-pane -Z')).toEqual(['zoom-pane'])
  })

  it('really closes the pane and the window once the question is answered', () => {
    const run = (id: string) => {
      const entry = REFERENCE_ENTRIES.find(candidate => candidate.id === id)!
      const fixture = FIXTURES[id]
      return simulate(fixture.start!, [...entryInputs(entry)[0], ...(fixture.after ?? [])]).state
    }
    expect(run('kill-pane').sessions[0].windows[0].layoutTree.type).toBe('pane')
    expect(run('kill-window').sessions[0].windows).toHaveLength(1)
  })
})
