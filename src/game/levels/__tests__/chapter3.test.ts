import { describe, it, expect } from 'vitest'
import { click, keys, line, save } from '@/game/sim/inputs'
import type { PlayerInput } from '@/game/sim/simulate'
import { completes, levelById, met } from './level-kit'

// Easy ways through chapter 3 that must not complete a level, and fair routes that still must.

const CONF = '~/.tmux.conf'

const setPrefix = line(':set -g prefix C-a')
const bindBar = line(':bind-key | split-window -h')

describe('3-1 key customisation', () => {
  const level = levelById('3-1')

  it('is not completed by the default split key', () => {
    expect(completes(level, keys('C-b', '%'))).toBe(false)
    expect(completes(level, [setPrefix, bindBar, ...keys('C-b', '%')])).toBe(false)
  })

  it('is not completed by a typed split', () => {
    expect(completes(level, [setPrefix, bindBar, line(':split-window -h')])).toBe(false)
  })

  it('is not completed by setting the prefix and binding without splitting', () => {
    expect(completes(level, [setPrefix, bindBar])).toBe(false)
  })

  it('is not completed by the new prefix with the old split key', () => {
    expect(completes(level, [setPrefix, bindBar, ...keys('C-a', '%')])).toBe(false)
  })

  it('is not completed by pressing | under the old prefix and changing the prefix afterwards', () => {
    expect(completes(level, [bindBar, ...keys('C-b', '|'), setPrefix])).toBe(false)
  })

  it('is not completed by pressing | while the prefix is switched back to the old one', () => {
    const flip = [setPrefix, line(':set -g prefix C-b'), bindBar, ...keys('C-b', '|'), setPrefix]
    expect(met(level, flip)).toEqual(['prefix', 'bind'])
  })

  it('is not completed when | splits the other way', () => {
    expect(completes(level, [setPrefix, line(':bind-key | split-window -v'), ...keys('C-a', '|')])).toBe(false)
  })

  it('is completed with the commands typed at the shell', () => {
    const inputs = [line('tmux set -g prefix C-a'), line("tmux bind-key '|' split-window -h"), ...keys('C-a', '|')]
    expect(completes(level, inputs)).toBe(true)
  })

  it('is completed when the binding keeps the current directory', () => {
    const inputs = [setPrefix, line(':bind | split-window -h -c "#{pane_current_path}"'), ...keys('C-a', '|')]
    expect(completes(level, inputs)).toBe(true)
  })
})

describe('3-2 mouse mode', () => {
  const level = levelById('3-2')
  const mouseOn = line(':set -g mouse on')

  it('is not completed by keyboard navigation', () => {
    expect(completes(level, keys('C-b', 'Right'))).toBe(false)
    expect(completes(level, [mouseOn, ...keys('C-b', 'Right')])).toBe(false)
    expect(completes(level, [mouseOn, line(':select-pane -t p2')])).toBe(false)
  })

  it('is not completed by a click while the mouse is off', () => {
    expect(completes(level, [click('p2')])).toBe(false)
    expect(completes(level, [click('p2'), mouseOn])).toBe(false)
  })

  it('is not completed when the mouse is turned off again', () => {
    expect(completes(level, [mouseOn, click('p2'), line(':set -g mouse off')])).toBe(false)
  })

  it('is not completed when the click is followed by a move back to p1', () => {
    expect(completes(level, [mouseOn, click('p2'), click('p1')])).toBe(false)
  })

  it('is completed with the mouse turned on from the shell', () => {
    expect(completes(level, [line('tmux set -g mouse on'), click('p2')])).toBe(true)
  })
})

describe('3-3 status bar', () => {
  const level = levelById('3-3')
  const blue = line(':set -g status-style bg=blue')
  const clock = line(':set -g status-right "%H:%M"')

  it('is not completed by one status option alone', () => {
    expect(completes(level, [blue])).toBe(false)
    expect(completes(level, [clock])).toBe(false)
    expect(completes(level, [line(':set -g status-position top')])).toBe(false)
  })

  it('is not completed by a blue foreground or a clock without minutes', () => {
    expect(completes(level, [line(':set -g status-style fg=blue'), clock])).toBe(false)
    expect(completes(level, [blue, line(':set -g status-right "%H"')])).toBe(false)
  })

  it('is completed with other styles and text kept around the required ones', () => {
    expect(completes(level, [line(':set -g status-style bg=blue,fg=white'), line(':set -g status-right "#S %H:%M"')])).toBe(true)
    expect(completes(level, [line("tmux set -g status-right '%H:%M'"), line('tmux set -g status-style bg=blue')])).toBe(true)
  })

  it('is completed with the styles separated by a space', () => {
    expect(completes(level, [line(':set -g status-style "bg=blue fg=white"'), clock])).toBe(true)
  })
})

const CONF_TEXT = 'set -g prefix C-a\nset -g mouse on\nbind r source-file ~/.tmux.conf\n'
const writeConf = (text: string): PlayerInput[] => [line(`vim ${CONF}`), save(CONF, text)]

describe('3-4 config file', () => {
  const level = levelById('3-4')

  it('is not completed by typing the three commands by hand', () => {
    const typed = [setPrefix, line(':set -g mouse on'), line(':bind r source-file ~/.tmux.conf'), ...keys('C-a', 'r')]
    expect(completes(level, typed)).toBe(false)
  })

  it('is not completed by sourcing a file that lacks the lines', () => {
    const partial = [...writeConf('set -g mouse on\n'), line(`:source-file ${CONF}`)]
    expect(completes(level, partial)).toBe(false)
    expect(completes(level, [...partial, setPrefix, line(':bind r source-file ~/.tmux.conf'), ...keys('C-a', 'r')])).toBe(false)
  })

  it('does not count settings that came from another file', () => {
    const other = [line('vim ~/other.conf'), save('~/other.conf', CONF_TEXT), line(':source-file ~/other.conf')]
    const inputs = [...writeConf('# nothing yet\n'), ...other, line(`:source-file ${CONF}`), ...keys('C-a', 'r')]
    expect(met(level, inputs)).toEqual(['saved', 'reloaded'])
  })

  it('is not completed without the reload by the new key', () => {
    expect(completes(level, [...writeConf(CONF_TEXT), line(`:source-file ${CONF}`)])).toBe(false)
    expect(completes(level, [...writeConf(CONF_TEXT), line(`:source-file ${CONF}`), line(`:source-file ${CONF}`)])).toBe(false)
  })

  it('ticks the saved file and the loaded config separately', () => {
    expect(met(level, writeConf(CONF_TEXT))).toEqual(['saved'])
    expect(met(level, [...writeConf(CONF_TEXT), line(`:source-file ${CONF}`)])).toEqual(['saved', 'loaded'])
  })

  it('is completed with other formatting and the shell form of source-file', () => {
    const text = '# my config\nset-option -g prefix C-a\nset -g mouse on\n\nbind-key r source-file ~/.tmux.conf\n'
    expect(completes(level, [...writeConf(text), line(`tmux source-file ${CONF}`), ...keys('C-a', 'r')])).toBe(true)
  })
})

const DEV_SCRIPT = [
  'tmux new-session -d -s dev -n editor',
  'tmux split-window -h -t dev:editor',
  'tmux new-window -t dev -n server',
  "tmux send-keys -t dev:server 'npm run dev' Enter",
  'tmux attach -t dev',
].join('\n')

const runScript = (path: string, text: string): PlayerInput[] => [line(`vim ${path}`), save(path, text), line(`bash ${path}`)]

describe('3-5 scripted start', () => {
  const level = levelById('3-5')

  it('is not completed by typing the commands by hand', () => {
    const typed = DEV_SCRIPT.split('\n').map(text => line(text))
    expect(completes(level, typed)).toBe(false)
  })

  it('is not completed by a script that builds only part', () => {
    const noServer = DEV_SCRIPT.split('\n').filter(text => !text.includes('server')).join('\n')
    expect(completes(level, runScript('~/dev.sh', noServer))).toBe(false)
    const noSplit = DEV_SCRIPT.split('\n').filter(text => !text.includes('split')).join('\n')
    expect(completes(level, runScript('~/dev.sh', noSplit))).toBe(false)
    const noAttach = DEV_SCRIPT.split('\n').filter(text => !text.includes('attach')).join('\n')
    expect(completes(level, runScript('~/dev.sh', noAttach))).toBe(false)
  })

  it('is not completed when the script leaves out npm run dev and the player types it', () => {
    const noNpm = DEV_SCRIPT.split('\n').filter(text => !text.includes('npm')).join('\n')
    expect(completes(level, [...runScript('~/dev.sh', noNpm), line(':select-window -t server'), line('npm run dev')])).toBe(false)
  })

  it('is not completed by faking the output with echo', () => {
    const faked = DEV_SCRIPT.replace("send-keys -t dev:server 'npm run dev' Enter", "send-keys -t dev:server 'echo npm run dev' Enter")
    expect(completes(level, runScript('~/dev.sh', faked))).toBe(false)
  })

  it('is completed by a script under another name using short command names', () => {
    const short = [
      'tmux new -d -s dev -n editor',
      'tmux splitw -h -t dev:editor',
      'tmux neww -t dev -n server',
      "tmux send -t dev:server 'npm run dev' Enter",
    ].join('\n')
    expect(completes(level, [...runScript('~/start.sh', short), line('tmux attach -t dev')])).toBe(true)
  })

  it('is completed when the script types the command with a space after it', () => {
    const spaced = DEV_SCRIPT.replace("'npm run dev'", "'npm run dev '")
    expect(completes(level, runScript('~/dev.sh', spaced))).toBe(true)
  })
})

describe('3-6 advanced window operations', () => {
  const level = levelById('3-6')

  it('is not completed by a new window named tools in project', () => {
    expect(completes(level, [line(':new-window -n tools')])).toBe(false)
    expect(completes(level, [line(':new-window -n tools'), line(':kill-session -t utils')])).toBe(false)
  })

  it('is not completed by link-window', () => {
    expect(completes(level, [line(':link-window -s utils:tools -t project:')])).toBe(false)
  })

  it('is not completed by swapping tools with a project window', () => {
    expect(completes(level, [line(':swap-window -s utils:tools -t project:beta')])).toBe(false)
  })

  it('is not completed by swapping tools in and then moving another window', () => {
    const inputs = [line(':swap-window -s utils:tools -t project:beta'), line(':move-window -s project:alpha -t project:5')]
    expect(completes(level, inputs)).toBe(false)
  })

  it('is not completed by moving another window', () => {
    expect(completes(level, [line(':move-window -s project:beta -t utils:')])).toBe(false)
  })

  it('is completed with the shell form or a short window target', () => {
    expect(completes(level, [line('tmux move-window -s utils:tools -t project:')])).toBe(true)
    expect(completes(level, [line(':movew -s utils:0 -t project')])).toBe(true)
  })
})

const EXAM_CONF = 'set -g prefix C-a\nbind | split-window -h\n'
const EXAM_SCRIPT = 'tmux new-session -d -s work -n main\ntmux attach -t work\n'
const SOURCING_SCRIPT = 'tmux new-session -d -s work -n main\ntmux source-file ~/.tmux.conf\ntmux attach -t work\n'

describe('3-7 chapter exam', () => {
  const level = levelById('3-7')
  const files = [...writeConf(EXAM_CONF), ...runScript('~/work.sh', EXAM_SCRIPT)]

  it('is not completed by typed commands with no files', () => {
    const typed = [line('tmux new -s work -n main'), setPrefix, bindBar, ...keys('C-a', '|')]
    expect(completes(level, typed)).toBe(false)
  })

  it('is not completed by the default split key instead of the custom one', () => {
    expect(completes(level, [...files, ...keys('C-a', '%')])).toBe(false)
    expect(completes(level, [...files, line(':split-window -h')])).toBe(false)
  })

  it('is not completed when the session is typed and only the config is a file', () => {
    const inputs = [...writeConf(EXAM_CONF), line('tmux new -s work -n main'), line(`:source-file ${CONF}`), ...keys('C-a', '|')]
    expect(completes(level, inputs)).toBe(false)
  })

  it('is not completed when the config is typed and only the session is scripted', () => {
    const script = 'tmux new-session -d -s work -n main\ntmux attach -t work\n'
    const inputs = [...runScript('~/work.sh', script), setPrefix, bindBar, ...keys('C-a', '|')]
    expect(completes(level, inputs)).toBe(false)
  })

  it('is not completed by pressing | while the prefix is switched back to the old one', () => {
    const flip = [...files, line(':set -g prefix C-b'), ...keys('C-b', '|'), setPrefix]
    expect(met(level, flip)).toEqual(['config', 'session'])
  })

  it('is not completed when the script splits main and the key splits another window', () => {
    const script = [
      'tmux new-session -d -s work -n main', 'tmux source-file ~/.tmux.conf', 'tmux split-window -h -t work:main',
      'tmux new-window -t work -n other', 'tmux attach -t work', '',
    ].join('\n')
    const inputs = [...writeConf(EXAM_CONF), ...runScript('~/work.sh', script), ...keys('C-a', '|')]
    expect(met(level, inputs)).toEqual(['config', 'session'])
  })

  it('is not completed by a session with other names', () => {
    const script = EXAM_SCRIPT.replace('-s work -n main', '-s dev -n main').replace('-t work', '-t dev')
    expect(completes(level, [...writeConf(EXAM_CONF), ...runScript('~/work.sh', script), ...keys('C-a', '|')])).toBe(false)
  })

  it('is completed by a script that leaves the config to the starting server', () => {
    expect(completes(level, [...files, ...keys('C-a', '|')])).toBe(true)
  })

  it('is completed when the script sources the config itself', () => {
    expect(completes(level, [...writeConf(EXAM_CONF), ...runScript('~/work.sh', SOURCING_SCRIPT), ...keys('C-a', '|')])).toBe(true)
  })

  it('is completed when the config is saved after the script ran and sourced by hand', () => {
    const inputs = [...runScript('~/work.sh', EXAM_SCRIPT), ...writeConf(EXAM_CONF), line(`:source-file ${CONF}`), ...keys('C-a', '|')]
    expect(completes(level, inputs)).toBe(true)
  })
})
