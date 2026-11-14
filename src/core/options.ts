import type { KeyId, TmuxState } from './types'
import { DEFAULT_PREFIX } from './keymap'

export type OptionSpec =
  | { readonly kind: 'flag'; readonly default: 'on' | 'off' }
  | { readonly kind: 'key'; readonly default: KeyId }
  | { readonly kind: 'choice'; readonly default: string; readonly choices: readonly string[] }
  | { readonly kind: 'string'; readonly default: string }
  | { readonly kind: 'number'; readonly default: string }

/**
 * Global options the simulator accepts. `synchronize-panes` is not here: it is per window and lives on `Window`.
 * `status-right` defaults to the host name only, so a clock the player adds is a visible change.
 */
export const OPTIONS = {
  prefix: { kind: 'key', default: DEFAULT_PREFIX },
  mouse: { kind: 'flag', default: 'off' },
  status: { kind: 'flag', default: 'on' },
  'status-position': { kind: 'choice', default: 'bottom', choices: ['top', 'bottom'] },
  'status-style': { kind: 'string', default: 'bg=green,fg=black' },
  'status-left': { kind: 'string', default: '[#S] ' },
  'status-right': { kind: 'string', default: '"#H"' },
  'status-interval': { kind: 'number', default: '15' },
  'window-status-current-style': { kind: 'string', default: 'default' },
  'pane-border-style': { kind: 'string', default: 'default' },
  'pane-active-border-style': { kind: 'string', default: 'fg=green' },
  'mode-keys': { kind: 'choice', default: 'emacs', choices: ['emacs', 'vi'] },
  'history-limit': { kind: 'number', default: '2000' },
  'escape-time': { kind: 'number', default: '500' },
  'default-terminal': { kind: 'string', default: 'screen' },
} as const satisfies Record<string, OptionSpec>

export type OptionName = keyof typeof OPTIONS

export function isOptionName(name: string): name is OptionName {
  return Object.hasOwn(OPTIONS, name)
}

/** The value of a global option: what was set, or the default. */
export function getOption(state: TmuxState, name: OptionName): string {
  return Object.hasOwn(state.options, name) ? state.options[name] : OPTIONS[name].default
}

export function isOn(state: TmuxState, name: OptionName): boolean {
  return getOption(state, name) === 'on'
}
