import { describe, it, expect } from 'vitest'
import { TERMINAL_COLOURS, styleColours } from '../status-style'

describe('styleColours', () => {
  it('reads named background and foreground colours', () => {
    expect(styleColours('bg=green,fg=black')).toEqual({ background: TERMINAL_COLOURS.green, color: TERMINAL_COLOURS.black })
  })

  it('accepts spaces, either spelling of colourN and the bright names', () => {
    expect(styleColours('fg=colour1 bg=color4')).toEqual({ background: TERMINAL_COLOURS.blue, color: TERMINAL_COLOURS.red })
    expect(styleColours('bg=brightblue')).toEqual({ background: TERMINAL_COLOURS.blue })
  })

  it('passes hex colours through', () => {
    expect(styleColours('bg=#1A2b3c')).toEqual({ background: '#1A2b3c' })
  })

  it('leaves out what is default, unknown or not a colour', () => {
    expect(styleColours('default')).toEqual({})
    expect(styleColours('bg=default,fg=nosuchcolour,bold')).toEqual({})
    expect(styleColours('bg=colour200')).toEqual({})
  })

  it('lets a later setting win', () => {
    expect(styleColours('bg=red,bg=blue')).toEqual({ background: TERMINAL_COLOURS.blue })
  })
})
