import { DEFAULT_PREFIX, DEFAULT_PREFIX_BINDINGS, displayKey } from '@/core/keymap'
import type { KeyId } from '@/core/types'
import { key, line } from '@/game/sim/inputs'
import type { PlayerInput } from '@/game/sim/simulate'

export type ReferenceCategoryId = 'session' | 'window' | 'pane' | 'copy' | 'config'

/** One key of a sequence, or a choice of keys any one of which may be pressed there. */
export type KeyStep = KeyId | readonly KeyId[]

interface EntryBase {
  /** Also the i18n key of its description: `reference.entries.<id>`. */
  readonly id: string
  readonly popular?: boolean
}

/** Keys pressed one after another. */
export interface KeysEntry extends EntryBase {
  readonly kind: 'keys'
  readonly keys: readonly KeyStep[]
}

/** A line typed in the command box: a shell command, or a tmux command after `:`. */
export interface LineEntry extends EntryBase {
  readonly kind: 'line'
  readonly text: string
}

export type ReferenceEntry = KeysEntry | LineEntry

export interface ReferenceCategory {
  /** Name and blurb: `reference.categories.<id>`, `reference.descriptions.<id>`. */
  readonly id: ReferenceCategoryId
  readonly icon: string
  readonly entries: readonly ReferenceEntry[]
}

const press = (id: string, keys: readonly KeyStep[], popular = false): KeysEntry => ({ id, kind: 'keys', keys, popular })
const type = (id: string, text: string, popular = false): LineEntry => ({ id, kind: 'line', text, popular })

const ARROWS: readonly KeyId[] = ['Up', 'Down', 'Left', 'Right']
const withModifier = (modifier: string) => ARROWS.map(arrow => `${modifier}-${arrow}`)

export const REFERENCE: readonly ReferenceCategory[] = [
  {
    id: 'session',
    icon: '💻',
    entries: [
      type('new-session', 'tmux new -s work', true),
      type('attach', 'tmux attach -t work', true),
      type('list-sessions', 'tmux ls'),
      press('detach', ['C-b', 'd'], true),
      type('new-detached', 'tmux new -d -s dev'),
      type('switch-client', 'tmux switch-client -t dev'),
      press('rename-session', ['C-b', '$']),
      type('kill-session', 'tmux kill-session -t dev'),
    ],
  },
  {
    id: 'window',
    icon: '🪟',
    entries: [
      press('new-window', ['C-b', 'c'], true),
      type('new-window-named', ':new-window -n logs'),
      press('next-window', ['C-b', 'n'], true),
      press('previous-window', ['C-b', 'p']),
      press('select-window', ['C-b', '1']),
      press('rename-window', ['C-b', ',']),
      press('kill-window', ['C-b', '&']),
      type('move-window', ':move-window -s utils:tools -t project:'),
    ],
  },
  {
    id: 'pane',
    icon: '🔳',
    entries: [
      press('split-side', ['C-b', '%'], true),
      press('split-stacked', ['C-b', '"'], true),
      press('select-pane', ['C-b', ARROWS], true),
      press('next-pane', ['C-b', 'o']),
      press('kill-pane', ['C-b', 'x']),
      press('zoom-pane', ['C-b', 'z'], true),
      press('resize-pane', ['C-b', withModifier('C')]),
      press('resize-pane-5', ['C-b', withModifier('M')]),
      press('swap-pane', ['C-b', ['{', '}']]),
      press('break-pane', ['C-b', '!']),
      type('join-pane', ':join-pane -h -s temp -t main'),
      press('next-layout', ['C-b', 'Space']),
      type('select-layout', ':select-layout even-horizontal'),
      type('synchronize-panes', ':setw synchronize-panes on'),
    ],
  },
  {
    id: 'copy',
    icon: '📋',
    entries: [
      press('copy-mode', ['C-b', '['], true),
      press('copy-move', [ARROWS]),
      press('copy-select', ['Space']),
      press('copy-copy', ['Enter']),
      press('copy-quit', ['q']),
      press('paste', ['C-b', ']'], true),
    ],
  },
  {
    id: 'config',
    icon: '⚙️',
    entries: [
      press('command-prompt', ['C-b', ':']),
      type('prefix', ':set -g prefix C-a'),
      type('bind-key', ':bind-key | split-window -h'),
      type('mouse', ':set -g mouse on', true),
      type('status-style', ':set -g status-style bg=blue'),
      type('status-right', ':set -g status-right "%H:%M"'),
      type('edit-conf', 'vim ~/.tmux.conf'),
      type('source-file', ':source-file ~/.tmux.conf'),
      type('run-script', 'bash ~/dev.sh'),
    ],
  },
]

export const REFERENCE_ENTRIES: readonly ReferenceEntry[] = REFERENCE.flatMap(category => category.entries)

const choices = (step: KeyStep): readonly KeyId[] => (typeof step === 'string' ? [step] : step)

/** One step as shown: `Ctrl+b`, or a choice like `↑/↓`. */
export const stepText = (step: KeyStep): string => choices(step).map(displayKey).join('/')

/** The entry as the player presses or types it. */
export function entryText(entry: ReferenceEntry): string {
  return entry.kind === 'line' ? entry.text : entry.keys.map(stepText).join(' ')
}

/** The tmux commands the entry's keys run by default, so `split-window` finds `Ctrl+b %`. */
function boundCommands(entry: KeysEntry): readonly string[] {
  const [first, second] = entry.keys
  if (first !== DEFAULT_PREFIX || second === undefined) return []
  return choices(second).map(key => DEFAULT_PREFIX_BINDINGS[key] ?? '')
}

function searchableText(entry: ReferenceEntry, description: string): string {
  const raw = entry.kind === 'line' ? [] : [...entry.keys.flatMap(choices), ...boundCommands(entry)]
  return [entryText(entry), raw.join(' '), description.replaceAll('`', '')].join('\n').toLowerCase()
}

/**
 * The categories with only the entries matching `query` (in what is pressed or typed, or in the
 * description `describe` gives), leaving out the categories with none.
 */
export function filterReference(query: string, describe: (entry: ReferenceEntry) => string): ReferenceCategory[] {
  const needle = query.trim().toLowerCase()
  return REFERENCE
    .map(category => ({
      ...category,
      entries: category.entries.filter(entry => searchableText(entry, describe(entry)).includes(needle)),
    }))
    .filter(category => category.entries.length > 0)
}

/** Every way to do the entry: one key sequence per combination of choices, or its one typed line. */
export function entryInputs(entry: ReferenceEntry): PlayerInput[][] {
  if (entry.kind === 'line') return [[line(entry.text)]]
  return entry.keys.reduce<PlayerInput[][]>(
    (sequences, step) => sequences.flatMap(sequence => choices(step).map(choice => [...sequence, key(choice)])),
    [[]],
  )
}
