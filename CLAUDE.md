# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TmuxCraft is a browser-based interactive game for learning tmux. Players complete levels by executing real tmux commands in a simulated terminal environment. Built with React 19, TypeScript, and Vite.

## Commands

```bash
npm run dev       # Start dev server (Vite HMR)
npm run build     # Type-check (tsc -b) then build for production
npm run lint      # ESLint
npm run preview   # Preview production build
npx vitest run    # Run all tests
npx vitest run src/core/__tests__/command-parser.test.ts  # Run single test file
npx vitest --watch  # Watch mode
```

Note: `npm run build` has pre-existing TS errors in test files and some utility files (unused variables, implicit any). These do not affect the production build via Vite, only `tsc -b` strict checking.

## Architecture

### Three-Layer Engine Design

**Core Layer** (`src/core/`) — Framework-agnostic tmux simulation:
- `tmux-engine.ts` — State machine managing Session → Window → Pane hierarchy. All mutations go through `execute(command)`. Uses internal ID counter (prefix-incrementing) for panes/windows/sessions.
- `command-parser.ts` — Parses three input formats: CLI commands (`tmux split-window -v`), colon commands (`:split-window`), and prefix key sequences (`Ctrl+b "`). Returns `ParsedCommand | ParseError`. Includes Levenshtein distance for command suggestions on typos.
- `layout-engine.ts` — Binary tree layout system. Each `LayoutNode` is either a `pane` leaf or a `split` node with two children and a ratio. Handles split, close, resize (ratio clamped to [0.1, 0.9]), swap, and preset layouts (even-horizontal, even-vertical, main-horizontal, main-vertical, tiled).
- `keybinding-handler.ts` — Two-step prefix key state machine: `idle` → (Ctrl+b) → `waiting` → (second key) → execute + reset. 2-second timeout auto-resets. Supports Ctrl+Arrow for resize.
- `types.ts` — All domain types. `TmuxState` → `Session[]` → `Window` (with `layoutTree: LayoutNode`) → `Pane`. 30+ command types.

**Game Layer** (`src/game/`) — Level definitions and game mechanics:
- `levels/chapter1/`, `chapter2/`, `chapter3/` — 26 levels total (11+8+7). Each level defines `initialState`, `objectives` with validator functions, `optimalSteps`, and hint keys.
- `levels/helpers.ts` — State builder functions: `paneNode()`, `split()`, `makeWindow()`, `makeSession()`, `makeState()`, `singlePaneState()`.
- `validator.ts` — Checks objectives against current TmuxState. Returns `{ isComplete, completedObjectives }`. Evaluates ALL objectives simultaneously — does NOT persist previously completed objectives.
- `scoring.ts` — 3-star system: completed, efficient (≤ optimal × 1.5), noHints.
- `challenge/` — Procedural challenge generator with difficulty tiers (beginner 60s, intermediate 90s, advanced 120s), leaderboard (localStorage).
- `achievements.ts` — 15 achievements checked both on level completion and per-command (context achievements for combo count and pane count).

**UI Layer** (`src/components/`) — React components:
- Screen-based navigation via `useGameStore().setScreen()` (not URL routing). 9 screens switched in `App.tsx`: home, chapter-select, level-select, game, challenge-select, challenge, achievements, reference, settings.
- `game/GameScreen.tsx` — Main gameplay: left terminal (60%) + right objectives (40%) + bottom taskbar. Integrates engine via `useTmuxEngine` hook. Contains `renderHintText()` which parses hint strings with regex and wraps keyboard shortcuts in styled `<kbd>` elements. Manages command history (local state, up/down arrow navigation) and combo system.
- `game/PaneRenderer.tsx` — Recursive renderer for `LayoutNode` tree. Active pane highlighted with accent border. Zoom uses absolute positioning (not in layout tree — stored as `isZoomed` per Pane).

### Hooks (`src/hooks/`)

- `useTmuxEngine.ts` — React wrapper for TmuxEngine. Uses refs to maintain instance across renders. Auto-resets engine when `initialState` prop changes (level transitions).
- `useKeyCapture.ts` — Browser key capture for prefix shortcuts. Creates `KeybindingHandler`, attaches to `window.keydown`. Special handling for `rename-window` (triggers browser prompt for name input).

### State Management (Zustand)

Three stores in `src/store/`:
- `game-store.ts` — Session state: current screen, active level, command count, combo, hints. Not persisted.
- `progress-store.ts` — Persisted to `localStorage` key `tmuxcraft-progress` (schema version 2). Level stars, achievements, challenge records, chapter completion. `CHAPTER_SIZES` constant defines level counts per chapter (currently `{1: 11, 2: 8, 3: 7}`).
- `user-store.ts` — Persisted to `localStorage` key `tmuxcraft-user`. Language setting (`zh`|`en`) only.

### Command Flow (End-to-End)

User input → `CommandParser.parseInput()` → `ParsedCommand` → `TmuxEngine.execute()` → state update → React re-render via `useTmuxEngine` hook → `validateLevel()` checks objectives.

For prefix keys: `useKeyCapture` → `KeybindingHandler.handleKeyDown()` → `parseKeySequence()` → same engine execution path.

Validation skips when `commandCount === 0` to avoid race conditions before first command.

### Critical Gotchas

- **Objective validation is stateless**: All objectives must be true simultaneously at time of check. Sequential mutually-exclusive objectives (e.g., "active pane is p1" then "active pane is p2") won't work.
- **Chapter size constants must stay in sync**: `CHAPTER_SIZES` in `progress-store.ts` AND `CHAPTERS` array totals in `ChapterSelect.tsx` must match actual level counts.
- **i18n keys must exist in both files**: Level definitions reference keys that must be present in both `src/i18n/zh.json` and `src/i18n/en.json`.
- **Challenge mode unlock**: Beginner requires Chapter 1 complete, Intermediate requires Chapter 2, Advanced requires Chapter 3.
- **All user-facing text must support i18n**: This includes dynamically generated text (e.g., challenge goal descriptions in `challenge-generator.ts`). Never hardcode Chinese or English strings — either use `t()` keys or accept a `lang` parameter and produce both language variants. The challenge generator uses the `lang` parameter approach since its descriptions contain runtime values.

### Level Definition Conventions

When adding/modifying levels:
- Level IDs must match pattern `"chapter-level"` (e.g., `"2-4"`), sequential within chapter
- `titleKey` and `descriptionKey` reference `levels.X-Y.title` / `levels.X-Y.description` in i18n
- Hints reference `game.hints.X-Y-N` (N = 1-3), multi-objective levels use `game.objectives.X-Y-key`
- Tutorial levels use `game.tutorial.X-Y-stepN` keys
- Use helper functions from `levels/helpers.ts` to build initial state (`singlePaneState()`, `makeState()`, etc.)
- Update `CHAPTER_SIZES` in `progress-store.ts` and `CHAPTERS` in `ChapterSelect.tsx` when changing level counts

### i18n

`react-i18next` with two translation files: `src/i18n/zh.json` and `src/i18n/en.json`. Fallback language is `zh`. All user-facing text uses `t()` keys. tmux commands themselves are never translated.

## Tailwind v4

Uses CSS-based configuration in `src/styles/globals.css` with `@theme` directive. Custom color tokens (e.g., `bg-bg-primary`, `text-accent`, `border-border`) and font variables (`--font-pixel`, `--font-mono`, `--font-ui`). Custom utility classes: `.pixel-box`, `.pixel-btn`, `.hp-bar`, `.glow-text`. Custom animations: `cursor-blink`, `shimmer`, `float`.

## Testing

Tests cover the core engine layer only (`src/core/__tests__/`). Tests use a `cmd(type, args)` helper to construct `ParsedCommand` objects (isolating engine logic from parser). The engine is tested by creating a `TmuxEngine` instance, executing commands, and asserting on the resulting `TmuxState`. No React component tests exist.

## Path Alias

`@/` maps to `src/` (configured in both `vite.config.ts` and `tsconfig.app.json`).
