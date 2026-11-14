# TmuxCraft v2 任务清单

分支 `feat/v2`，每阶段结束本地提交一次，不 push。每阶段结束时 `npm run lint`、`npm run typecheck`、`npm test` 必须全绿。

范围：保留 26 关及编号和存档；第三章内置多行编辑器；保留浅色风格并系统化；README 中英双份。

## P0 基线

- [x] 建分支 `feat/v2`
- [x] lint 30 个错误清零（另有 2 个被遮住的 `set-state-in-effect` 一并修掉）
- [x] `tsc -b` 1 个错误清零
- [x] `package.json` 加 `test` / `typecheck` / `coverage` / `test:e2e` 脚本
- [x] 覆盖率配置（v8，`src/core` + `src/game`，阈值 80%）
- [x] `tasks/todo.md`、`tasks/lessons.md`
- [x] 本地提交

基线数据：159 个测试通过；覆盖率 行 54.65% / 函数 38.28% / 分支 48.5%（`src/game` 目前没有测试，P4 结束时要达到 80%）。

## P1 核心基础模块（与旧引擎并存）

- [ ] `types.ts`：`TmuxState` 新增 `keyTables`、`copyMode`、`files`、`log`，窗口级 `zoomed`
- [ ] `errors.ts`：错误码 `{ code, params }`
- [ ] `state.ts`、`selectors.ts`、`update.ts`（不可变更新）
- [ ] `tokenize.ts`、`argparse.ts`（flag 在第一个位置参数处停止）
- [ ] `target.ts`：解析 `-t session:window.pane`
- [ ] `keymap.ts`：默认按键表、保留键
- [ ] 各模块单测先行

## P2 命令表与 executeLine

- [ ] `executeLine(state, line, ctx) => { state, ok, output, errors }`
- [ ] 会话 / 窗口 / 面板 / 布局命令
- [ ] 选项 / 按键绑定 / 状态栏格式
- [ ] shell 内置命令、脚本执行、虚拟文件、复制模式
- [ ] 布局修复：even-horizontal / even-vertical 对调、resize 方向
- [ ] 崩溃修复：`:join-pane` 无 `-s`、`:select-window` 无 `-t`；`:next` 映射
- [ ] `reduceKey` 纯函数
- [ ] 纠错提示（Levenshtein）真正返回
- [ ] 现有引擎和解析器测试移植为按行执行的测试，数量不减

## P3 切换到新引擎

- [ ] `useTmuxSession`、`useKeyCapture` 接新引擎
- [ ] 每关初始状态可加载的测试
- [ ] 删除 `tmux-engine.ts`、`command-parser.ts`、`keybinding-handler.ts`、`useTmuxEngine.ts`

## P4 关卡改写

- [ ] `game/sim/simulate.ts`、`levels/predicates.ts`
- [ ] 关卡表测试：初始不过关 / 空操作不过关 / 参考解法按 `optimalSteps` 过关 / 已知捷径不过关
- [ ] i18n 测试：中英 key 一致，关卡引用的 key 都存在
- [ ] 第一章 11 关
- [ ] 第二章 8 关
- [ ] 第三章 7 关（含编辑器文件）
- [ ] `zh.json` / `en.json` 文案同步改写
- [ ] `tutorialSteps` 渲染为分步引导

## P5 UI 系统化

- [ ] `globals.css` 设计变量、`:focus-visible`、`prefers-reduced-motion`
- [ ] `src/components/ui/`：Button、IconButton、ScreenHeader、PageBackground、Card、ProgressBar、StarRating、Dialog、Kbd、Confetti、Toast
- [ ] 全部页面改用变量和组件
- [ ] `GameScreen.tsx` 拆分
- [ ] 配置编辑器、鼠标模式、状态栏渲染、复制模式覆盖层
- [ ] 交互修复：前缀命令回显、PREFIX 徽标、行内重命名、`tmux ls` 输出、提示扣星逻辑
- [ ] 响应式布局
- [ ] 首页“继续游戏”和速查表入口；硬编码字符串进 i18n
- [ ] 浏览器实测（`/browse`）

## P6 挑战模式、存档、语言

- [ ] 难度真正生效（60 / 90 / 120 秒），快捷键可用
- [ ] 校验器检查分屏方向；生成器接受随机种子
- [ ] 选择页显示最佳成绩；删除 `leaderboard.ts`
- [ ] `progress-store` v3 迁移保留进度（测试先行）
- [ ] 语言设置统一为一个来源

## P7 文档、截图、e2e

- [ ] `README.md`（英文）重写，新增 `README.zh-CN.md`
- [ ] 更新 `CLAUDE.md`
- [ ] `package.json` name `tmuxcraft`、version `2.0.0`
- [ ] Playwright 冒烟：首页 → 1-1 通关；3-4 编辑器保存并 source；挑战模式开始一局
- [ ] 重截图，删除过时截图

## 待用户决定

- README 写的是 MIT，但仓库没有 LICENSE 文件。默认不添加；要加的话需要版权署名。

## Review

（每阶段结束后补充）
