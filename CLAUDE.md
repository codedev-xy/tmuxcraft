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
npx vitest run    # Run all 159 tests
npx vitest run src/core/__tests__/command-parser.test.ts  # Run single test file
npx vitest --watch  # Watch mode
```

Note: `npm run build` has pre-existing TS errors in test files and some utility files (unused variables, implicit any). These do not affect the production build via Vite, only `tsc -b` strict checking.

## Architecture

### Three-Layer Engine Design

**Core Layer** (`src/core/`) — Framework-agnostic tmux simulation:
- `tmux-engine.ts` — State machine managing Session → Window → Pane hierarchy. All mutations go through `execute(command)`. Emits events for state changes.
- `command-parser.ts` — Parses three input formats: CLI commands (`tmux split-window -v`), colon commands (`:split-window`), and prefix key sequences (`Ctrl+b "`). Returns `ParsedCommand | ParseError`.
- `layout-engine.ts` — Binary tree layout system. Each `LayoutNode` is either a `pane` leaf or a `split` node with two children and a ratio. Handles split, close, resize, swap, and preset layouts (even-horizontal, tiled, etc).
- `types.ts` — All domain types. `TmuxState` → `Session[]` → `Window` (with `layoutTree: LayoutNode`) → `Pane`. 30+ command types.

**Game Layer** (`src/game/`) — Level definitions and game mechanics:
- `levels/chapter1/`, `chapter2/`, `chapter3/` — 26 levels total (11+8+7). Each level defines `initialState`, `objectives` with validator functions, `optimalSteps`, and hint keys.
- `validator.ts` — Checks objectives against current TmuxState. Returns `{ isComplete, completedObjectives }`. Evaluates ALL objectives simultaneously — does NOT persist previously completed objectives. Sequential mutually-exclusive objectives won't work.
- `scoring.ts` — 3-star system: completed, efficient (≤ optimal × 1.5), noHints.
- `challenge/` — Procedural challenge generator with difficulty tiers, time limits, and leaderboard (localStorage).

**UI Layer** (`src/components/`) — React components:
- Screen-based navigation via `useGameStore().setScreen()` (not URL routing). 9 screens switched in `App.tsx`.
- `game/GameScreen.tsx` — Main gameplay: left terminal (60%) + right objectives (40%) + bottom taskbar. Integrates engine via `useTmuxEngine` hook. Contains `renderHintText()` which parses hint strings and wraps keyboard shortcuts in styled `<kbd>` elements.
- `game/PaneRenderer.tsx` — Recursive renderer for `LayoutNode` tree. Active pane highlighted with accent border.

### State Management (Zustand)

Three stores in `src/store/`:
- `game-store.ts` — Session state: current screen, active level, command count, combo, hints. Not persisted.
- `progress-store.ts` — Persisted to `localStorage` key `tmuxcraft-progress` (schema version 2). Level stars, achievements, challenge records, chapter completion. `CHAPTER_SIZES` constant defines level counts per chapter (currently `{1: 11, 2: 8, 3: 7}`).
- `user-store.ts` — Persisted to `localStorage` key `tmuxcraft-user`. Username, language (`zh`|`en`), sound toggle.

### Key Integration Points

**Command flow**: User input → `CommandParser.parseInput()` → `ParsedCommand` → `TmuxEngine.execute()` → state update → React re-render via `useTmuxEngine` hook → `validateLevel()` checks objectives.

**Prefix key capture**: `useKeyCapture` hook intercepts `Ctrl+b` in browser, enters "prefix mode" waiting for next key, maps to command via `KeybindingHandler`, dispatches to engine.

**Level unlocking**: `isLevelUnlocked()` in `progress-store.ts` parses level ID strings `"X-Y"` and checks if `"X-(Y-1)"` is completed. Level IDs must be sequential integers within each chapter.

### Level Definition Conventions

When adding/modifying levels:
- Level IDs must match pattern `"chapter-level"` (e.g., `"2-4"`), sequential within chapter
- `titleKey` and `descriptionKey` reference `levels.X-Y.title` / `levels.X-Y.description` in i18n
- Hints reference `game.hints.X-Y-N` (N = 1-3), multi-objective levels use `game.objectives.X-Y-key`
- Tutorial levels use `game.tutorial.X-Y-stepN` keys
- Both `src/i18n/zh.json` and `src/i18n/en.json` must be updated in sync
- `CHAPTER_SIZES` in `progress-store.ts` and `CHAPTERS` array in `ChapterSelect.tsx` must match actual level counts

### i18n

`react-i18next` with two translation files: `src/i18n/zh.json` and `src/i18n/en.json`. All user-facing text uses `t()` keys. tmux commands themselves are never translated.

## Tailwind v4

Uses CSS-based configuration in `src/styles/globals.css` with `@theme` directive. Custom color tokens (e.g., `bg-bg-primary`, `text-accent`, `border-border`) and font variables (`--font-pixel`, `--font-mono`, `--font-ui`). Custom utility classes: `.pixel-box`, `.pixel-btn`, `.hp-bar`, `.glow-text`.

## Testing

Tests cover the core engine layer only (`src/core/__tests__/`). Tests use a `cmd(type, args)` helper to construct `ParsedCommand` objects. The engine is tested by creating a `TmuxEngine` instance, executing commands, and asserting on the resulting `TmuxState`.

## Path Alias

`@/` maps to `src/` (configured in both `vite.config.ts` and `tsconfig.app.json`).

## Current Status

**已完成的工作：**
- 完整项目框架搭建（Vite + React 19 + TS + Tailwind v4 + Zustand + i18next）
- tmux 核心引擎：Session/Window/Pane 状态机、命令解析器、布局引擎、快捷键处理
- 26 个关卡（Chapter 1: 11关, Chapter 2: 8关, Chapter 3: 7关），全部可通关
- 挑战模式（随机目标生成、倒计时、排行榜）
- 成就系统、3星评分、连击机制、提示系统
- 中英文 i18n 完整翻译
- 159 个单元测试全部通过
- 首页双按钮布局：学习模式 + 挑战模式并排
- 提示文本中按键高亮：Ctrl+b 组合、冒号命令、CLI 命令均以 `<kbd>` 样式显示

**待办 / 可改进项：**
- 音效系统（Howler.js 已引入但未实装，`useSound` hook 是占位）
- UI 组件测试（当前只有 core 层测试，无 React 组件测试）
- 响应式适配优化（当前最低适配约 1024×768）
- 完善无障碍访问（ARIA labels）
- 视觉细节打磨：中文像素字体回退效果、动画微调
- 桌面客户端包装（Electron/Tauri，后期目标）
