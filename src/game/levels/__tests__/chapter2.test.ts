import { describe, it, expect } from 'vitest'
import { drag, key, keys, line, prompt } from '@/game/sim/inputs'
import type { PlayerInput } from '@/game/sim/simulate'
import { completes, levelById, met } from './level-kit'

// Easy ways through chapter 2 that must not complete a level, and honest alternatives that must.

const times = (count: number, inputs: readonly PlayerInput[]): PlayerInput[] =>
  Array.from({ length: count }, () => inputs).flat()

describe('level 2-1 (resize)', () => {
  const level = levelById('2-1')

  it('does not pass when the border moves the wrong way', () => {
    expect(completes(level, times(4, keys('C-b', 'M-Left')))).toBe(false)
  })

  it('does not pass when the left pane is only a little wider', () => {
    expect(completes(level, keys('C-b', 'M-Right'))).toBe(false)
    expect(completes(level, times(3, keys('C-b', 'M-Right')))).toBe(false)
  })

  it('does not pass when the left pane is far too wide', () => {
    expect(completes(level, [line(':resize-pane -R 30')])).toBe(false)
  })

  it('does not pass when the right pane is replaced by a narrower new one', () => {
    expect(completes(level, [line(':kill-pane -t 1'), line(':split-window -h -p 30')])).toBe(false)
  })

  it('passes with the typed command', () => {
    expect(completes(level, [line(':resize-pane -R 20')])).toBe(true)
  })

  it('passes with one-cell presses that land inside the band', () => {
    expect(completes(level, times(18, keys('C-b', 'C-Right')))).toBe(true)
  })

  it('passes when the border is dragged with the mouse', () => {
    expect(completes(level, [line(':set -g mouse on'), drag('p1', 'right', 20)])).toBe(true)
  })
})

describe('level 2-2 (preset layouts)', () => {
  const level = levelById('2-2')

  it('does not pass with a stacked preset', () => {
    expect(completes(level, [line(':select-layout even-vertical')])).toBe(false)
    expect(completes(level, keys('C-b', 'Space', 'C-b', 'Space'))).toBe(false)
  })

  it('does not pass with a row of uneven panes', () => {
    expect(completes(level, [line(':select-layout even-horizontal'), line(':resize-pane -t 0 -R 10')])).toBe(false)
  })

  it('does not pass when the panes are thrown away and rebuilt', () => {
    const rebuild = [line(':kill-pane -t 2'), line(':kill-pane -t 1'), line(':split-window -h'), line(':split-window -h')]
    expect(completes(level, [...rebuild, line(':select-layout even-horizontal')])).toBe(false)
  })

  it('passes with one press of the next-layout key', () => {
    expect(completes(level, keys('C-b', 'Space'))).toBe(true)
  })
})

describe('level 2-3 (swap panes)', () => {
  const level = levelById('2-3')

  it('does not pass when the labels are faked with echo', () => {
    const fake = [line('echo Panel A'), key('C-b'), key('Right'), line('echo Panel B')]
    expect(completes(level, fake)).toBe(false)
  })

  it('does not pass after swapping back to the start', () => {
    expect(completes(level, keys('C-b', '}', 'C-b', '}'))).toBe(false)
  })

  it('passes with the other swap key', () => {
    expect(completes(level, keys('C-b', '{'))).toBe(true)
  })

  it('passes with the typed command', () => {
    expect(completes(level, [line(':swap-pane -s 0 -t 1')])).toBe(true)
  })
})

describe('level 2-4 (break and join)', () => {
  const level = levelById('2-4')

  it('does not pass when temp is killed and a new window made', () => {
    expect(completes(level, [line(':kill-window -t temp'), line(':new-window')])).toBe(false)
  })

  it('does not pass when temp is only renamed', () => {
    expect(completes(level, [line(':rename-window -t temp notes')])).toBe(false)
  })

  it('does not pass with only one of the two moves', () => {
    expect(completes(level, keys('C-b', '!'))).toBe(false)
    expect(completes(level, [line(':join-pane -h -s temp -t main')])).toBe(false)
  })

  it('does not pass when the joined pane is stacked instead of side by side', () => {
    expect(met(level, [...keys('C-b', '!'), line(':join-pane -s temp -t main')])).toEqual(['break'])
  })

  it('does not pass when the panes are swapped across windows and temp renamed', () => {
    expect(completes(level, [line(':swap-pane -s main.1 -t temp'), line(':rename-window -t temp logs')])).toBe(false)
  })

  it('passes when the player goes back to main before joining', () => {
    expect(completes(level, [...keys('C-b', '!', 'C-b', '0'), line(':join-pane -h -s temp')])).toBe(true)
  })
})

describe('level 2-5 (copy mode)', () => {
  const level = levelById('2-5')
  const copyLine = keys('C-b', '[', 'Space', '$', 'Enter')

  it('does not pass when the code is typed into the right pane', () => {
    expect(completes(level, [...keys('C-b', 'Right'), line('echo Alpha-Bravo-Charlie')])).toBe(false)
  })

  it('does not pass when the code is sent with send-keys', () => {
    expect(completes(level, [line(':send-keys -t 1 Alpha-Bravo-Charlie')])).toBe(false)
  })

  it('does not pass when the buffer is set by hand and pasted', () => {
    const fake = [line(':set-buffer Alpha-Bravo-Charlie'), line(':paste-buffer -t 1')]
    expect(completes(level, fake)).toBe(false)
  })

  it('does not pass when the code is copied but not pasted', () => {
    expect(completes(level, copyLine)).toBe(false)
    expect(met(level, copyLine)).toEqual(['copy'])
  })

  it('does not pass when the code is pasted into the left pane', () => {
    expect(completes(level, [...copyLine, ...keys('C-b', ']')])).toBe(false)
  })

  it('does not pass when only part of the line is copied', () => {
    expect(completes(level, [...keys('C-b', '[', 'Space', 'Right', 'Enter'), ...keys('C-b', 'Right', 'C-b', ']')])).toBe(false)
  })

  it('does not pass when something else is pasted and the code is typed after it', () => {
    const fake = [...copyLine, line(':set-buffer x'), line(':paste-buffer -t 1'), line(':send-keys -t 1 Alpha-Bravo-Charlie')]
    expect(met(level, fake)).toEqual(['copy'])
  })

  it('passes with vi keys and a typed paste', () => {
    expect(completes(level, [...keys('C-b', '[', 'v', '$', 'y'), line(':paste-buffer -t 1')])).toBe(true)
  })

  it('passes after the left pane was cleared and the file printed again', () => {
    const again = [line('clear'), line('cat secret.txt')]
    expect(completes(level, [...again, ...copyLine, ...keys('C-b', 'Right', 'C-b', ']')])).toBe(true)
  })
})

describe('level 2-6 (synchronize panes)', () => {
  const level = levelById('2-6')
  const syncOn = line(':setw synchronize-panes on')
  const eachPane = [line('echo deploy'), ...keys('C-b', 'Right'), line('echo deploy'), ...keys('C-b', 'Down'), line('echo deploy')]

  it('does not pass with sync on and nothing typed', () => {
    expect(completes(level, [syncOn])).toBe(false)
  })

  it('does not pass when the command is typed into each pane before sync is on', () => {
    expect(completes(level, [...eachPane, syncOn])).toBe(false)
  })

  it('does not pass when sync is turned off for the typing and back on after', () => {
    expect(completes(level, [syncOn, line(':setw synchronize-panes off'), ...eachPane, syncOn])).toBe(false)
  })

  it('does not pass when sync is off at the end', () => {
    expect(completes(level, [syncOn, line('echo deploy'), line(':setw synchronize-panes off')])).toBe(false)
  })

  it('does not pass with a different command', () => {
    expect(met(level, [syncOn, line('echo hello')])).toEqual(['sync'])
  })

  it('passes when the command is sent with send-keys while synchronized', () => {
    expect(completes(level, [syncOn, line(':send-keys "echo deploy" Enter')])).toBe(true)
  })

  it('passes however the command is spaced or quoted', () => {
    expect(completes(level, [syncOn, line('echo "deploy"')])).toBe(true)
    expect(completes(level, [syncOn, line('  echo   deploy ')])).toBe(true)
  })

  it('still passes after the panes are cleared', () => {
    expect(completes(level, [syncOn, line('echo deploy'), line('clear')])).toBe(true)
  })
})

describe('level 2-7 (sessions)', () => {
  const level = levelById('2-7')

  it('does not pass when default is renamed to dev', () => {
    const rename = [line('tmux rename-session -t default dev'), line('tmux new -d -s staging')]
    expect(completes(level, rename)).toBe(false)
  })

  it('does not pass when default is renamed to dev and a new default is created', () => {
    const rename = [line('tmux rename-session -t default dev'), line('tmux new -d -s default'), line('tmux new -d -s staging')]
    expect(met(level, rename)).toEqual(['switch'])
  })

  it('does not pass when the sessions are made but the client stays in default', () => {
    expect(completes(level, [line('tmux new -d -s dev'), line('tmux new -d -s staging')])).toBe(false)
  })

  it('does not pass with the nested form that fails inside tmux', () => {
    expect(completes(level, [line('tmux new -s dev'), line('tmux new -s staging')])).toBe(false)
  })

  it('passes from the tmux command prompt, which switches as it creates', () => {
    expect(completes(level, [line(':new -s staging'), line(':new -s dev')])).toBe(true)
  })
})

describe('level 2-8 (chapter exam)', () => {
  const level = levelById('2-8')
  const toDebug = [line('tmux new -d -s debug -n services'), line('tmux switch-client -t debug')]
  const threePanes = keys('C-b', '%', 'C-b', '%')
  const even = line(':select-layout even-horizontal')
  const sync = line(':setw synchronize-panes on')
  const db = line(':new-window -n db')

  it('does not pass with the old vague target of two sessions and four windows', () => {
    const vague = [line('tmux new -d -s x'), line(':new-window'), line(':new-window'), line(':new-window'), sync]
    expect(completes(level, vague)).toBe(false)
  })

  it('does not pass with uneven panes', () => {
    expect(met(level, [...toDebug, ...threePanes, sync, db])).toEqual(['session', 'sync', 'db'])
  })

  it('does not pass with stacked panes', () => {
    expect(completes(level, [...toDebug, ...threePanes, line(':select-layout even-vertical'), sync, db])).toBe(false)
  })

  it('does not pass with sync on the wrong window', () => {
    expect(met(level, [...toDebug, ...threePanes, even, db, sync])).toEqual(['session', 'panes', 'db'])
  })

  it('does not pass when the player never goes to debug', () => {
    const remote = [
      line('tmux new -d -s debug -n services'),
      line(':split-window -h -t debug:services'), line(':split-window -h -t debug:services'),
      line(':select-layout -t debug:services even-horizontal'),
      line(':setw -t debug:services synchronize-panes on'), line(':new-window -d -t debug -n db'),
    ]
    expect(met(level, remote)).toEqual(['panes', 'sync', 'db'])
  })

  it('does not pass when the starting session is renamed to debug instead of creating one', () => {
    const renamed = [
      line(':rename-session debug'), line(':rename-window services'),
      line(':split-window -h -p 66'), line(':split-window -h -p 50'), sync, db,
    ]
    expect(met(level, renamed)).toEqual(['panes', 'sync', 'db'])
  })

  it('passes when the panes are sized as they are split', () => {
    const sized = [...toDebug, line(':split-window -h -p 66'), line(':split-window -h -p 50'), sync, db]
    expect(completes(level, sized)).toBe(true)
  })

  it('passes when the session is created from the command prompt', () => {
    expect(completes(level, [line(':new -s debug -n services'), ...threePanes, even, sync, db])).toBe(true)
  })

  it('passes with the layout key and the prompt opened by its key', () => {
    const viaKeys = [...toDebug, ...threePanes, ...keys('C-b', 'Space', 'C-b', ':'), prompt('setw synchronize-panes on'), db]
    expect(completes(level, viaKeys)).toBe(true)
  })
})
