import { describe, it, expect } from 'vitest'
import { getActiveWindow } from '@/core/selectors'
import { keys, line, prompt } from '@/game/sim/inputs'
import { paneIds } from '../predicates'
import { completes, levelById, met, play } from './level-kit'

/** `Ctrl+b x`, then `y` when tmux asks. */
const killPane = () => [...keys('C-b', 'x'), prompt('y')]

// Easy ways through chapter 1 that must not complete a level, and fair routes that must.

describe('1-1 meet tmux', () => {
  const level = levelById('1-1')

  it('is not done by a session the player is not attached to', () => {
    expect(completes(level, [line('tmux new -d -s work')])).toBe(false)
  })

  it('is done by starting tmux with or without a name', () => {
    expect(completes(level, [line('tmux')])).toBe(true)
    expect(completes(level, [line('tmux new -s work')])).toBe(true)
  })
})

describe('1-2 splits', () => {
  const level = levelById('1-2')

  it('is not done by one split', () => {
    expect(completes(level, keys('C-b', '%'))).toBe(false)
    expect(completes(level, keys('C-b', '"'))).toBe(false)
  })

  it('is not done by splitting in one direction only', () => {
    expect(completes(level, keys('C-b', '%', 'C-b', '%'))).toBe(false)
    expect(completes(level, keys('C-b', '"', 'C-b', '"'))).toBe(false)
  })

  it('is not done by a layout that mixes directions without a stacked split', () => {
    expect(completes(level, [...keys('C-b', '%', 'C-b', '%'), line(':select-layout main-horizontal')])).toBe(false)
  })

  it('is not done when a pane is closed again', () => {
    expect(completes(level, [...keys('C-b', '%', 'C-b', '"'), ...killPane()])).toBe(false)
  })

  it('is done by either order, with keys or typed commands', () => {
    expect(completes(level, keys('C-b', '"', 'C-b', '%'))).toBe(true)
    expect(completes(level, [line(':split-window -h'), line(':split-window')])).toBe(true)
  })
})

describe('1-3 pane navigation', () => {
  const level = levelById('1-3')

  it('is not done by closing panes until the target is the active one', () => {
    const inputs = [...killPane(), ...killPane(), ...killPane()]
    expect(getActiveWindow(play(level, inputs))?.activePaneId).toBe('p4')
    expect(completes(level, inputs)).toBe(false)
  })

  it('is not done halfway', () => {
    expect(completes(level, keys('C-b', 'Right'))).toBe(false)
    expect(completes(level, keys('C-b', 'Down'))).toBe(false)
  })

  it('is done by going down first, or by a typed select-pane', () => {
    expect(completes(level, keys('C-b', 'Down', 'C-b', 'Right'))).toBe(true)
    expect(completes(level, [line(':select-pane -t 3')])).toBe(true)
  })
})

describe('1-4 close a pane', () => {
  const level = levelById('1-4')

  it('is not done by closing the pane that has focus at the start', () => {
    expect(completes(level, killPane())).toBe(false)
    expect(completes(level, [line('exit')])).toBe(false)
    expect(completes(level, [line(':kill-pane')])).toBe(false)
  })

  it('is not done by closing the wrong pane on the right', () => {
    expect(completes(level, [...keys('C-b', 'Right', 'C-b', 'Down'), ...killPane()])).toBe(false)
  })

  it('is not done when the player answers no', () => {
    expect(completes(level, [...keys('C-b', 'Right', 'C-b', 'x'), prompt('n')])).toBe(false)
  })

  it('is not done by moving the pane to its own window instead of closing it', () => {
    const inputs = keys('C-b', 'Right', 'C-b', '!', 'C-b', 'p')
    expect(paneIds(getActiveWindow(play(level, inputs))!)).toEqual(['p1', 'p3'])
    expect(completes(level, inputs)).toBe(false)
  })

  it('is done by exit in the right pane, or by kill-pane with a target', () => {
    expect(completes(level, [...keys('C-b', 'Right'), line('exit')])).toBe(true)
    expect(completes(level, [line(':kill-pane -t 1')])).toBe(true)
  })
})

describe('1-5 four-pane grid', () => {
  const level = levelById('1-5')

  it('is not done by four side-by-side strips', () => {
    expect(completes(level, keys('C-b', '%', 'C-b', '%', 'C-b', '%'))).toBe(false)
  })

  it('is not done by four panes of unequal size', () => {
    expect(completes(level, keys('C-b', '%', 'C-b', '"', 'C-b', '"'))).toBe(false)
    expect(completes(level, keys('C-b', '"', 'C-b', '%', 'C-b', '%'))).toBe(false)
  })

  it('is done by stacking first and then splitting each half', () => {
    expect(completes(level, keys('C-b', '"', 'C-b', '%', 'C-b', 'Up', 'C-b', '%'))).toBe(true)
  })

  it('is done by the tiled layout, which is a real 2x2 grid', () => {
    expect(completes(level, [...keys('C-b', '%', 'C-b', '%', 'C-b', '%'), line(':select-layout tiled')])).toBe(true)
  })
})

describe('1-6 zoom', () => {
  const level = levelById('1-6')

  it('is not done by zooming the wrong pane', () => {
    expect(completes(level, keys('C-b', 'z'))).toBe(false)
  })

  it('is not done by moving to the pane without zooming', () => {
    expect(completes(level, keys('C-b', 'Right'))).toBe(false)
  })

  it('is not done by closing the other panes so the target fills the window', () => {
    const inputs = [line(':kill-pane -t 2'), line(':kill-pane -t 0'), ...keys('C-b', 'z')]
    expect(paneIds(getActiveWindow(play(level, inputs))!)).toEqual(['p2'])
    expect(completes(level, inputs)).toBe(false)
  })

  it('is done by typed commands', () => {
    expect(completes(level, [line(':select-pane -t 1'), line(':resize-pane -Z')])).toBe(true)
  })
})

describe('1-7 windows', () => {
  const level = levelById('1-7')

  it('is not done by one new window', () => {
    expect(completes(level, keys('C-b', 'c'))).toBe(false)
  })

  it('is not done by more windows than asked for', () => {
    expect(completes(level, keys('C-b', 'c', 'C-b', 'c', 'C-b', 'c'))).toBe(false)
  })

  it('is not done by windows in another session', () => {
    expect(completes(level, [line('tmux new -d -s other'), line(':new-window -t other'), line(':new-window -t other')])).toBe(false)
  })

  it('is done by typed new-window', () => {
    expect(completes(level, [line(':new-window'), line(':new-window')])).toBe(true)
  })
})

describe('1-8 switch windows', () => {
  const level = levelById('1-8')

  it('is not done by renaming the current window to gamma', () => {
    expect(completes(level, [line(':rename-window gamma')])).toBe(false)
  })

  it('is not done by closing windows until gamma is the current one', () => {
    const inputs = [...keys('C-b', '&'), prompt('y'), ...keys('C-b', '&'), prompt('y')]
    expect(getActiveWindow(play(level, inputs))?.name).toBe('gamma')
    expect(completes(level, inputs)).toBe(false)
  })

  it('is not done by stopping one window short', () => {
    expect(completes(level, keys('C-b', 'n'))).toBe(false)
  })

  it('is done by next-window twice, or by select-window with the name', () => {
    expect(completes(level, keys('C-b', 'n', 'C-b', 'n'))).toBe(true)
    expect(completes(level, [line(':select-window -t gamma')])).toBe(true)
  })
})

describe('1-9 rename windows', () => {
  const level = levelById('1-9')

  it('ticks only the windows that are named', () => {
    expect(met(level, [...keys('C-b', ','), prompt('editor')])).toEqual(['name-editor'])
  })

  it('is not done by naming them in the wrong order', () => {
    const inputs = [line(':rename-window -t :0 editor'), line(':rename-window -t :1 logs'), line(':rename-window -t :2 server')]
    expect(completes(level, inputs)).toBe(false)
  })

  it('is not done by new windows with those names', () => {
    const inputs = [line(':new-window -n editor'), line(':new-window -n server'), line(':new-window -n logs')]
    expect(completes(level, inputs)).toBe(false)
  })

  it('is not done by replacing the windows with new ones', () => {
    const inputs = [
      line(':new-window -n editor'), line(':new-window -n server'), line(':new-window -n logs'),
      line(':kill-window -t :0'), line(':kill-window -t :1'), line(':kill-window -t :2'),
    ]
    expect(completes(level, inputs)).toBe(false)
  })

  it('is done by rename-window with targets', () => {
    const inputs = [line(':rename-window -t :0 editor'), line(':rename-window -t :1 server'), line(':rename-window -t :2 logs')]
    expect(completes(level, inputs)).toBe(true)
  })
})

describe('1-10 detach and reattach', () => {
  const level = levelById('1-10')

  it('is not done by doing nothing tmux-related or something unrelated', () => {
    expect(completes(level, [])).toBe(false)
    expect(completes(level, keys('C-b', 'c'))).toBe(false)
  })

  it('is not done by detaching only', () => {
    expect(completes(level, keys('C-b', 'd'))).toBe(false)
  })

  it('is not done by starting a different session instead of reattaching', () => {
    expect(completes(level, [...keys('C-b', 'd'), line('tmux new -s other')])).toBe(false)
    expect(completes(level, [...keys('C-b', 'd'), line('tmux new -d -s other'), line('tmux attach -t other')])).toBe(false)
  })

  it('is done by a plain tmux attach, or by typed commands', () => {
    expect(completes(level, [...keys('C-b', 'd'), line('tmux attach')])).toBe(true)
    expect(completes(level, [line(':detach-client'), line('tmux a -t mywork')])).toBe(true)
  })
})

describe('1-11 chapter exam', () => {
  const level = levelById('1-11')
  const named = [...keys('C-b', ','), prompt('editor'), line(':new-window -n server'), line(':new-window -n logs')]

  it('is not done by the right names without splits', () => {
    expect(completes(level, named)).toBe(false)
  })

  it('is not done by splits in the wrong direction', () => {
    const inputs = [...keys('C-b', ','), prompt('editor'), ...keys('C-b', '"'),
      line(':new-window -n server'), line(':new-window -n logs'), ...keys('C-b', '%')]
    expect(completes(level, inputs)).toBe(false)
  })

  it('is not done by the windows in the wrong order', () => {
    const inputs = [...keys('C-b', ','), prompt('editor'), ...keys('C-b', '%'),
      line(':new-window -n logs'), ...keys('C-b', '"'), line(':new-window -n server')]
    expect(completes(level, inputs)).toBe(false)
  })

  it('is not done with an extra window', () => {
    expect(completes(level, [...level.solution, ...keys('C-b', 'c')])).toBe(false)
  })

  it('is done by the route that only uses keys', () => {
    const inputs = [
      ...keys('C-b', ','), prompt('editor'), ...keys('C-b', '%'),
      ...keys('C-b', 'c', 'C-b', ','), prompt('server'),
      ...keys('C-b', 'c', 'C-b', ','), prompt('logs'), ...keys('C-b', '"'),
    ]
    expect(completes(level, inputs)).toBe(true)
  })
})
