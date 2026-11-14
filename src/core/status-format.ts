import type { TmuxState } from './types'
import { getOption, isOn } from './options'
import { currentWindow, getActiveSession, windowPanes } from './selectors'

/** What `#H` and `#h` expand to. */
export const HOST_NAME = 'tmuxcraft'

export interface StatusWindow {
  readonly index: number
  readonly name: string
  readonly current: boolean
}

export interface StatusLine {
  readonly visible: boolean
  readonly position: 'top' | 'bottom'
  /** The raw `status-style` option. */
  readonly style: string
  readonly left: string
  readonly right: string
  readonly windows: readonly StatusWindow[]
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const SHORT_FORMATS: Readonly<Record<string, string>> = {
  S: 'session_name', W: 'window_name', I: 'window_index', P: 'pane_index', H: 'host', h: 'host',
}

/** `#{long}`, `#[style]`, `#x` and `%x`, read in one pass so a value is never expanded twice. */
const SEQUENCE = /#\{([^}]*)\}|#\[[^\]]*\]|#(.)|%(.)/g

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** Values of the long formats for the current session, window and pane; empty without a session. */
function formatValues(state: TmuxState): Readonly<Record<string, string>> {
  const session = getActiveSession(state)
  const window = session ? currentWindow(session) : null
  const paneIndex = window ? windowPanes(window).findIndex(pane => pane.id === window.activePaneId) : -1
  return {
    session_name: session?.name ?? '',
    window_name: window?.name ?? '',
    window_index: session && window ? String(session.activeWindowIndex) : '',
    pane_index: paneIndex < 0 ? '' : String(paneIndex),
    host: HOST_NAME,
  }
}

function strftime(conversion: string, now: Date): string | undefined {
  const hours = now.getHours()
  const fields: Readonly<Record<string, () => string>> = {
    H: () => pad(hours),
    M: () => pad(now.getMinutes()),
    S: () => pad(now.getSeconds()),
    Y: () => String(now.getFullYear()),
    y: () => pad(now.getFullYear() % 100),
    m: () => pad(now.getMonth() + 1),
    d: () => pad(now.getDate()),
    a: () => DAYS[now.getDay()],
    b: () => MONTHS[now.getMonth()],
    p: () => (hours < 12 ? 'AM' : 'PM'),
    I: () => pad(hours % 12 === 0 ? 12 : hours % 12),
    R: () => `${pad(hours)}:${pad(now.getMinutes())}`,
    T: () => `${pad(hours)}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
    F: () => `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    '%': () => '%',
  }
  return Object.hasOwn(fields, conversion) ? fields[conversion]() : undefined
}

function expand(state: TmuxState, text: string, now: Date | null): string {
  const values = formatValues(state)
  const lookup = (name: string) => (Object.hasOwn(values, name) ? values[name] : undefined)
  return text.replace(SEQUENCE, (match, long?: string, short?: string, conversion?: string) => {
    if (long !== undefined) return lookup(long) ?? match
    if (short !== undefined) {
      if (short === '#') return '#'
      return Object.hasOwn(SHORT_FORMATS, short) ? values[SHORT_FORMATS[short]] : match
    }
    if (conversion !== undefined) return now ? strftime(conversion, now) ?? match : match
    return ''
  })
}

/** Expands tmux formats (`#S`, `#{window_name}`, `##`), drops `#[…]` style runs and applies strftime `%` conversions. */
export function expandFormat(state: TmuxState, text: string, now: Date): string {
  return expand(state, text, now)
}

/** Expands only the `#` formats and leaves `%` alone, as tmux does for `command-prompt -I`. */
export function expandNames(state: TmuxState, text: string): string {
  return expand(state, text, null)
}

/** What the status line shows; null when there is no attached session to show. */
export function renderStatus(state: TmuxState, now: Date): StatusLine | null {
  const session = state.isDetached ? null : getActiveSession(state)
  if (!session) return null
  return {
    visible: isOn(state, 'status'),
    position: getOption(state, 'status-position') === 'top' ? 'top' : 'bottom',
    style: getOption(state, 'status-style'),
    left: expandFormat(state, getOption(state, 'status-left'), now),
    right: expandFormat(state, getOption(state, 'status-right'), now),
    windows: session.windows.map((window, index) => ({ index, name: window.name, current: index === session.activeWindowIndex })),
  }
}
