# TmuxCraft

Master your terminal, level by level.

TmuxCraft is a browser-based interactive game for learning tmux. Players complete levels by executing real tmux commands in a simulated terminal environment — no actual terminal required.

## Features

- **26 levels** across 3 chapters (Basics → Advanced → Mastery)
- **Real command parsing** — supports CLI commands (`tmux split-window -v`), colon commands (`:split-window`), and prefix key sequences (`Ctrl+b "`)
- **Simulated tmux engine** — full Session → Window → Pane hierarchy with binary tree layouts
- **Challenge mode** — procedural random objectives with timer and leaderboard
- **Achievement system** — track milestones with a 3-star scoring system
- **Bilingual** — full Chinese and English support (i18n)
- **Command reference** — built-in tmux cheatsheet

## Tech Stack

- React 19 + TypeScript
- Vite 7
- Tailwind CSS v4
- Zustand (state management)
- Framer Motion (animations)
- react-i18next (internationalization)
- Vitest (testing, 159 tests)

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build |
| `npx vitest run` | Run all tests |

## Architecture

```
src/
├── core/           # Framework-agnostic tmux simulation engine
│   ├── tmux-engine.ts      # State machine (Session → Window → Pane)
│   ├── command-parser.ts   # CLI / colon / prefix key parsing
│   └── layout-engine.ts    # Binary tree pane layout system
├── game/           # Level definitions and game mechanics
│   ├── levels/             # 26 levels across 3 chapters
│   ├── validator.ts        # Objective checking
│   └── scoring.ts          # 3-star scoring system
├── components/     # React UI components
├── store/          # Zustand stores (game, progress, user)
├── hooks/          # Custom React hooks
├── i18n/           # zh.json + en.json translations
└── styles/         # Tailwind v4 theme and utilities
```

## License

MIT
