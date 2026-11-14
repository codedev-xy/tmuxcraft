/** The eight terminal colours in tmux's order (`colour0` to `colour7`), tuned to the dark terminal theme. */
export const TERMINAL_COLOURS = {
  black: '#0f172a',
  red: '#ef4444',
  green: '#22c55e',
  yellow: '#eab308',
  blue: '#3b82f6',
  magenta: '#d946ef',
  cyan: '#06b6d4',
  white: '#e2e8f0',
} as const

type ColourName = keyof typeof TERMINAL_COLOURS

const NAMES = Object.keys(TERMINAL_COLOURS) as ColourName[]
const HEX = /^#[0-9a-f]{6}$/i
const NUMBERED = /^colou?r(\d+)$/

export interface StyleColours {
  background?: string
  color?: string
}

/** A tmux colour as CSS; undefined for `default` and for colours the simulator does not draw. */
function cssColour(value: string): string | undefined {
  if (HEX.test(value)) return value
  const numbered = NUMBERED.exec(value)
  // 8 to 15 are the bright variants; they are drawn like the plain ones.
  if (numbered) return Number(numbered[1]) < 16 ? TERMINAL_COLOURS[NAMES[Number(numbered[1]) % 8]] : undefined
  const name = value.replace(/^bright/, '')
  return NAMES.includes(name as ColourName) ? TERMINAL_COLOURS[name as ColourName] : undefined
}

/** The colours of a tmux style string such as `bg=blue,fg=white`; attributes like `bold` are ignored. */
export function styleColours(style: string): StyleColours {
  const colours: StyleColours = {}
  for (const part of style.split(/[,\s]+/)) {
    const [key, value = ''] = part.split('=')
    const colour = cssColour(value)
    if (colour === undefined) continue
    if (key === 'bg') colours.background = colour
    if (key === 'fg') colours.color = colour
  }
  return colours
}
