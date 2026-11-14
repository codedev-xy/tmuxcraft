# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TmuxCraft is a browser game that teaches tmux. Players type real tmux commands, press prefix keys and use the mouse in a simulated terminal to complete 26 levels (3 chapters) and timed challenges. Stack: React 19, TypeScript, Vite, Tailwind v4, Zustand, react-i18next (zh / en), framer-motion, Vitest + Testing Library, Playwright.

## Commands

```bash
npm run dev        # Vite dev server
npm run build      # tsc -b, then vite build
npm run lint       # eslint .
npm run typecheck  # tsc -b
npm test           # vitest run (unit + component tests under src/)
npm run coverage   # vitest run --coverage (v8, 80% threshold on src/core and src/game)
npm run test:e2e   # playwright test (specs in e2e/, config in playwright.config.ts)
npm run preview    # preview the production build
npx vitest run src/game/levels/__tests__/levels.test.ts  # run one test file
npx vitest         # watch mode
```

`npm run lint`, `npm run typecheck` and `npm test` must all pass before committing.

## Architecture

### Core (`src/core/`) — pure-function tmux simulator

No React, no classes, no mutation: every function takes a `TmuxState` and returns a new one.
- `types.ts` — `TmuxState` (sessions, `options`, `keyTables`, `copyMode`, `prompt`, `files`, `log`, `nextId`, `prefixPending`, `outer`, `editing`) → `Session` → `Window` (`layoutTree`, `activePaneId`, `synchronizePanes`, `zoomed`, `layoutIndex`) → `Pane` (`content`, `input`, `cwd`).
- `state.ts` — `emptyState()` (no server, detached), `defaultState()` (one session `0`, window `bash`, pane `p1`), builders, `allocId` / `nextIdAfter`. IDs are `p{n}` / `w{n}` / `s{n}` from one counter that never reuses a number.
- `commands/` — the single command table `COMMANDS` (`commands/index.ts`), one file per area (session, window, pane, layout, options, keys, files, buffer, send-keys). Each `CommandSpec` has `name`, `aliases`, `flags`, `minArgs` / `maxArgs`, `requiresServer`, `run`. `find.ts` resolves names/aliases/unique prefixes against tmux's full name list (`tmux-names.ts`); a real tmux command the simulator lacks is `command.unsupported`, a typo gets a Levenshtein suggestion (`suggest.ts`).
- `execute.ts` — `executeLine` (tmux syntax inside tmux: `:` prompt, key bindings, config lines) and `executeArgv` (`tmux …` from the shell). Both tokenize (`tokenize.ts`), parse flags (`argparse.ts`), run the spec and append a log entry.
- `shell.ts` / `shell-builtins.ts` / `script.ts` — the pane shell: `submitLine` is what the command box runs (`:`-prefixed → `executeLine`, otherwise a shell line, broadcast when `synchronize-panes` is on). Supports `tmux`, `exit`, `bash`/`sh <script>`, `echo`, `clear`, `pwd`, `ls`, `cat`, `vim`/`vi`/`nano` (opens the editor); only `;` and `&&`.
- `target.ts` — `-t` parsing: `session:window.pane`, `%<paneId>`, `@<windowId>`, `+`/`-`, unique name prefixes.
- `keymap.ts` — `DEFAULT_PREFIX` (`C-b`), `DEFAULT_PREFIX_BINDINGS` (key → command line), `RESERVED_KEYS` (`C-w`, `C-t`, `C-n`: the browser keeps them), `keyFromEvent`, `normalizeKey`.
- `reduce-key.ts` (`reduceKey`) → `key-handler.ts` (prefix / root tables) or `copy-mode.ts`. `mouse.ts` (`clickPane`, `dragBorder`, only with `mouse on`). `prompt.ts` (`submitPrompt`, `cancelPrompt`; `confirm-before` prompts run on `y`). `files.ts` (virtual files, `normalizePath`, `saveFile` logs `save-file` and closes the editor).
- `options.ts` — `OPTIONS` with defaults; `getOption` / `isOn`. Options change behaviour: `prefix`, `mouse`, `status`, `status-position`, `status-style`, `status-left` / `status-right` (rendered by `status-format.ts` `renderStatus`). `bind-key` edits `keyTables`.
- `errors.ts` — `ERROR_CODES`, `TmuxError { code, params, suggestion?, at? }`, `Result<T>`. Core never produces prose.
- `layout-engine.ts` — binary `LayoutNode` tree: split, close, resize (ratio clamped to [0.1, 0.9], one cell = 1% of the split), swap, presets (`PRESET_LAYOUTS`), `calculateLayout`.
- `selectors.ts` (`getActiveSession` / `getActiveWindow` / `getActivePane`, `locatePane`, …), `update.ts` (immutable updates, `appendLog`), `engine.ts` (`ENGINE` = `COMMANDS` + shell, passed into everything that runs lines).

### Game (`src/game/`)

- `sim/simulate.ts` — `PlayerInput` (`line`, `prompt`, `key`, `click`, `drag`, `save`), `applyInput(state, input)` → `InputResult { state, ok, output, errors, handled, counted }`, and `simulate(state, inputs)` → `{ state, steps, results }`. `sim/inputs.ts` has builders `line`, `prompt`, `key`, `keys`, `click`, `drag`, `save`. The UI, level solutions and tests all use this one path.
- `level-types.ts` — `LevelDefinition`, `LevelObjective { id, descriptionKey, validate }`, `TutorialStep { messageKey, done }`, `ChallengeTask`, `ChallengeGoal`, `ChallengeRecord`, `LevelProgress`, `StarRating`.
- `levels/chapter1|2|3/` — 11 + 8 + 7 levels, grouped by topic file and re-exported from each `index.ts` (`chapter1Levels`, …); `checks.ts` holds chapter-specific checks. `levels/predicates.ts` has shared read-only checks: `sessionNamed`, `windowNamed`, `hasPanes`, `attachedTo`, layout shapes (`isRow`, `isColumn`, `isEvenRow`, `isEvenColumn`, `isGrid`), log queries (`ran`, `ranInOrder` with a `LogQuery` of name / origin / key / file / line / detail), `paneShows`. `levels/helpers.ts` builds states: `singlePaneState`, `makeState`, `makeSession`, `makeWindow`, `split`, `paneNode`.
- `chapters.ts` — `CHAPTERS`, `ALL_LEVELS`, `findLevel`, `levelAfter`, `nextUnfinished`, star totals. Chapter sizes come from here; nothing else stores them.
- `validator.ts` (`validateLevel` → `{ isComplete, progress, completedObjectives, remainingObjectives }`), `scoring.ts` (`calculateStars`: completed / efficient = commands ≤ `efficientBudget(optimalSteps)` = ceil(optimal × 1.5) / noHints), `hint-system.ts` (3 hints per level).
- `challenge/` — `generateChallenge(difficulty, random = Math.random)` → `ChallengeGoal { difficulty, tasks, solution }` (per-tier generators in `beginner.ts` / `intermediate.ts` / `advanced.ts`, task factories in `tasks.ts`); `challengeComplete`; `seededRandom` (`random.ts`); `CHALLENGE_TIME_LIMITS` 60 / 90 / 120 s (`difficulty.ts`); `bestRecord` / `isNewBest` (`records.ts`). Goals are played from `defaultState()`. No unlock requirements.
- `reference.ts` — the cheat-sheet table `REFERENCE` (5 categories), rendered by `components/reference/`.

### UI (`src/components/`)

- Navigation is `useGameStore().setScreen()`; `App.tsx` lazy-loads 8 screens: home, chapter-select, level-select, game, challenge-select, challenge, reference, settings.
- `ui/` — shared primitives (Button / IconButton, Card, Dialog, Kbd, Pill, ProgressBar, ScreenHeader, StarRating, Stat, PageBackground, Confetti, `cx`). Colour variants use the `Tone` type (`ui/tone.ts`), applied as a `data-tone` attribute.
- `screens/` — home, chapter/level select, reference, settings (version read from `package.json`), language toggle.
- `game/` — `GameScreen` mounts `LevelPlay` with `key={`${level.id}-${attempt}`}` (retry = remount). `useLevelPlay` wires session, validation, counters, hints and completion. `TerminalView` (panes, status bar, prompt line, output log, command box, `FileEditor`) and `PlayLayout` are shared with `challenge/ChallengeScreen`. `renderHintText` (`hint-utils.tsx`) turns backtick spans in level text into `<Kbd>`; `Walkthrough` renders `tutorialSteps`.
- `challenge/` — select screen (best records), round screen with countdown, task list, result dialog.

### Hooks (`src/hooks/`)

- `useTmuxSession(initial)` — holds `{ state, transcript }`; `send(input)` calls `applyInput`; `update(change)` changes state without it being an input (`cancelPrompt`, `cancelPrefix`, `closeEditor`). The initial state is read once — remount to restart.
- `useKeyCapture(onKey, enabled)` — window keydown listener in capture phase; converts with `keyFromEvent` and calls `preventDefault` only when tmux handled the key.

### Stores (`src/store/`, Zustand)

- `game-store.ts` — not persisted: screen, current level/chapter, `challengeDifficulty`, command count, hints used, combo, stars.
- `progress-store.ts` — persisted under `tmuxcraft-progress`, `PROGRESS_VERSION = 3`; holds `levelProgress` and `challengeRecords` only. `progress-migrate.ts` validates older saves entry by entry, keeps level progress and challenge records, and drops what it cannot read.
- There is no user store. The language lives in i18next only (`src/i18n/language.ts`, `useLanguage()`), cached by the language detector in localStorage `i18nextLng`.

### Input flow (end to end)

Keystroke: `useKeyCapture` → `TerminalView` `play({ type: 'key' })` → `useTmuxSession.send` → `applyInput` → `reduceKey` → prefix binding → `executeLine(binding, { origin: 'key', key })` → log entry. Command box: `play({ type: 'line' })` → `submitLine` → shell or `executeLine` / `executeArgv`. Then the new state re-renders, `useLevelPlay` runs `validateLevel` on it, and `onResult` counts the input if `counted`; completion (stars + save) fires once all objectives hold and the command count is > 0.

### Critical Gotchas

- **Validation reads the current state only**, all objectives at once; nothing is remembered between checks. To require that something *happened* (detached then reattached, set by a config file, split with a custom key), query the append-only `state.log` with `ran` / `ranInOrder`. Only successful commands are logged; each entry has an `origin` (`typed` / `key` / `mouse` / `config` / `script`), the firing `key`, the source `file`, and command-specific `detail` (e.g. `split-window` logs `direction: 'h' | 'v'`). Besides command names the log has `shell`, `save-file` and `copy-selection`.
- **What counts as a step** (`isStep` in `sim/simulate.ts`): an input that added a log entry. Opening a prompt (`command-prompt`, `confirm-before`) does not count, the prefix key alone does not count, and a shell line that only failed does not count. `optimalSteps` must equal what `simulate` counts for the level's `solution`.
- **Nothing counts before the first command**: completion is skipped while `commandCount === 0`, and `shownObjectives` hides ticks, so a level never starts half-solved.
- **Commands never log themselves**: the executor logs after a successful `run`; a failing command leaves the state untouched and stops the rest of a `;` sequence.
- **Split direction naming is inverted vs. tmux flags**: a `LayoutNode` with `direction: 'vertical'` lays children side by side (`split-window -h`); `'horizontal'` stacks them.
- **Bare-number pane targets** (`-t 1`) are pane indexes in the current window, as in tmux; write `:1` or the window name to target a window.
- **The first `new-session`** (no sessions yet) sources `~/.tmux.conf` automatically; later edits need `source-file`.
- **Hand-built states** must use `makeState` (or set `nextId` via `nextIdAfter`), otherwise generated IDs collide with existing ones.
- **Errors are codes**: add a new code to `ERROR_CODES` and give it `errors.<code>` text in both locales; `i18n/format-error.ts` renders it. A test rejects text for codes core cannot raise.
- **Adding or removing a level**: add it to the chapter's `index.ts` array; update the hard-coded counts in `game/__tests__/chapters.test.ts`, `game/levels/__tests__/levels-load.test.ts` and `components/screens/__tests__/LevelSelect.test.tsx`; add all its i18n keys to both files (the i18n test also fails on level keys no level uses).
- **React state following the engine**: set state from the `send`/`update` callbacks, never synchronously in an effect body (lint rule `react-hooks/set-state-in-effect`). Re-run lint after fixing a batch; some errors are hidden behind others.
- **Tests must assert the effect**, not just "state changed" (opening a confirm prompt also changes state).

### Level Definition Conventions

- IDs are `"chapter-level"` (`"2-4"`), sequential within the chapter; `chapter` and `level` fields match.
- `titleKey` / `descriptionKey` → `levels.X-Y.title` / `levels.X-Y.description`; `hints` → `game.hints.X-Y-1..3`; multi-objective levels use `game.objectives.X-Y-<objectiveId>`; walk-through steps use `game.tutorial.X-Y-stepN`. Single-objective levels may reuse `levels.X-Y.description` as the objective text (e.g. 1-1, 1-3).
- Every level needs an executable `solution: PlayerInput[]` written with the `sim/inputs.ts` builders, matching what the hints teach. `levels/__tests__/levels.test.ts` checks every level: not complete at start, not completed by no-op commands (`tmux ls`, `echo hi`, `clear`), every solution input works, the solution completes it, steps equal `optimalSteps`, no prefix of the solution completes it, and `tutorialSteps` tick in order.
- Shortcuts that must not pass (and fair alternatives that must) go in `levels/__tests__/chapter1|2|3.test.ts`, using `completes` / `met` / `play` from `level-kit.ts`. Write the failing test first.
- Mark keys and commands in level text with backticks so they render as key caps.

**Objective clarity requirements** (critical for player experience):
- Every objective description must tell the player **exactly** what to do. Never use vague phrases like "有意义的名字" (meaningful names) or "指定比例" (specified proportions) when the validator checks for specific values.
- If the validator checks for specific names, numbers, or targets, the description **must** state them (e.g. 1-9: "The first window (number 0) is renamed to 'editor'"; 2-1: "The left pane takes 67% to 73% of the window width").
- When a level has several distinct sub-goals, give each its own objective with a `game.objectives.X-Y-<id>` key (see 1-9, 1-11, 3-4). Single-objective levels are fine when the task is genuinely singular.
- If a validator requires *how* something was done (a specific key, `join-pane`, a line of `~/.tmux.conf`, a script), the description must say so (see 2-4, 3-4, 3-5).
- `levels.X-Y.description` (level select) is the summary; `game.objectives.*` are the checkable steps.

### i18n

`react-i18next` with `src/i18n/zh.json` and `src/i18n/en.json`; fallback `zh`; `<html lang>` follows the language. Both files must have identical key sets and no empty strings (`i18n/__tests__/level-keys.test.ts`). All user-facing text goes through `t()`, including runtime text: challenge tasks are `{ key, params }` under `challenge.tasks.*`, rendered with `t(key, params)`; errors via `formatError`. tmux commands are never translated.

## Styling

Tailwind v4, configured in `src/styles/globals.css` via `@theme`. `--color-*: initial` removes Tailwind's default palette: only the project tokens exist (`bg-page`, `bg-surface`, `text-ink-soft`, `bg-accent-deep`, `text-term-text`, `rounded-card`, `shadow-card`, `font-display` / `font-mono` / `font-ui`, …). `data-tone="…"` and `data-chapter="1|2|3"` set the `tone` / `chapter` colours (`bg-tone-soft`, `text-chapter-strong`, …) for everything inside; `.on-dark` marks the terminal for focus/scrollbar colours. Every global rule must sit inside `@layer base` or `@layer components` — an unlayered rule overrides all utility classes.

## Testing

Vitest (jsdom, `src/test-setup.ts` loads jest-dom) runs `src/**/*.{test,spec}.{ts,tsx}` in `__tests__/` folders next to the code: core, commands, game (levels, challenge, sim, reference), hooks, store, i18n and components (Testing Library + user-event). About 82 files / 1900 tests. Test files import `describe` / `it` / `expect` from `vitest` explicitly. Helpers: `core/__tests__/harness.ts` (`testEngine`, `must`, `errorOf`, `runLines`), `core/__tests__/shell-engine.ts` (`typeLines`, `pressKeys`, `deepFreeze`), `game/levels/__tests__/level-kit.ts`, `components/game/__tests__/terminal-harness.tsx` (`openTerminal`), `components/screens/__tests__/fixtures.ts`. Coverage covers `src/core/**/*.ts` and `src/game/**/*.ts` (80% lines/functions/branches/statements). Playwright tests live in `e2e/` and run with `npm run test:e2e` (they start the dev server); Vitest does not pick them up.

## Path Alias

`@/` maps to `src/` (configured in both `vite.config.ts` and `tsconfig.app.json`).

## Failure Records

Format: what failed → why → how to prevent.

- **`npm install -D @vitest/coverage-v8@^4.0.18` crashed with `Cannot read properties of null (reading 'edgesOut')`** → the caret range resolved to 4.1.12 while `vitest` is locked at 4.0.18; npm 10's arborist crashed in `#loadPeerSet` at `node_modules/vitest` (most likely the version-matched peer dependency) and never reported a conflict. The same install pinned to 4.0.18 succeeded. → Install `@vitest/*` packages with `--save-exact` at the exact version of the installed vitest (`node -p "require('./node_modules/vitest/package.json').version"`), and upgrade vitest and its `@vitest/*` companions together in one command.
- **A subagent ended with `API Error: Request rejected (429)` (rate limit) after 72 tool uses and returned no report** → five subagents were launched in parallel, each making many tool calls, and together they went over the account's rate limit. Its files were left without a final check (one test file did not type-check). → Launch at most three subagents at a time for long tasks. When one fails, do not assume its work is lost or finished: run `git status`, the tests and `tsc -b` on its files, then finish the rest directly or resume it with SendMessage.

