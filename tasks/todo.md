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

- [x] `types.ts`：`TmuxState` 新增 `options`、`keyTables`、`copyMode`、`prompt`、`files`、`log`、`nextId`，窗口级 `zoomed` / `layoutIndex`
- [x] `errors.ts`：错误码 `{ code, params }`
- [x] `state.ts`（含 `allocId` / `nextIdAfter`）、`selectors.ts`、`update.ts`（不可变更新）
- [x] `tokenize.ts`、`argparse.ts`（flag 在第一个位置参数处停止）
- [x] `target.ts`：解析 `-t session:window.pane`
- [x] `keymap.ts`：默认按键表、保留键
- [x] `options.ts`（选项默认值）、`files.ts`（虚拟文件路径归一化、保存记入日志）
- [x] 各模块单测先行

P1 结果：lint 0 错误、`tsc -b` 通过、测试 159 → 294 全过。旧引擎仍在用，旧字段标了 `@deprecated`，P3 切换时删。

P1 定下的行为（P2 起照此实现）：
- 生成的 ID 为 `p{n}` / `w{n}` / `s{n}`，共用一个只增不减的计数器；关卡初始状态的计数器自动设在已用编号之上。
- 窗口编号 = 在会话里的位置（从 0 起，关闭后自动重排）。
- 关掉当前所在的会话会脱离（detach），和真实 tmux 默认行为一致；旧引擎是自动切到另一个会话。
- `status-right` 默认只显示主机名、不带时钟（真实 tmux 默认带时钟），这样 3-3 加时钟才看得出变化。

## P2 命令表与 executeLine

- [x] `executeLine(state, line, ctx, engine) => { state, ok, output, errors }`
- [x] 会话 / 窗口 / 面板 / 布局命令
- [x] 选项 / 按键绑定 / 状态栏格式
- [x] shell 内置命令、脚本执行、虚拟文件、复制模式
- [x] 布局修复：even-horizontal / even-vertical 对调、resize 方向
- [x] 崩溃修复：`:join-pane` 无 `-s`（报缺少参数）、`:select-window` 无 `-t`（无操作）；`:next` 映射到 `next-window`
- [x] `reduceKey` 纯函数（另有 `clickPane` / `dragBorder` 处理鼠标）
- [x] 纠错提示（Levenshtein）真正返回（tmux 命令和 shell 命令都有）
- [x] 现有引擎和解析器测试移植为按行执行的测试，数量不减（旧 49 + 64 = 113，新 49 + 65 = 114）

P2 结果：lint 0 错误、`tsc -b` 通过、`npm run build` 通过、测试 294 → 1003 全过（38 个文件）。旧引擎和旧测试仍在，P3 切换后删除。

P2 定下的行为（P3 / P4 照此使用）：
- UI 入口：`submitLine`（命令框）、`reduceKey`（按键）、`clickPane` / `dragBorder`（鼠标）、`submitPrompt` / `cancelPrompt`、`saveFile` / `openEditor` / `closeEditor`、`renderStatus`。引擎实例是 `src/core/engine.ts` 的 `ENGINE`。
- 目标里的裸数字（`-t 1`、`-s 1`）先当作当前窗口的面板序号，和真实 tmux 一致；指窗口要写 `:1` 或窗口名。关卡提示里的 `join-pane` 要按这个写。
- 在会话内从 shell 输入 `tmux new -s x`（不带 `-d`）报嵌套错误；从 `:` 提示符输入则创建并切换。
- 失败的命令不记入 `log`；shell 行在它触发的命令之后记一条 `shell`。
- shell 只支持 `;` 和 `&&`，管道和重定向报“模拟器暂不支持”。
- 同步开启时，命令框输入的 shell 行广播到全部面板，`tmux …` 行除外。

P2 留下的小重复（P3 已收）：
- [x] `showWindow` 和 `selectWindowAt` 重复：`showWindow` 移到 `window-shared.ts`，只留一份。
- [x] `deepFreeze` 三份：测试共用一份。
- [x] 按键归一化 + 保留键检查两份：收进 `commands/key-shared.ts`。

P2 造成的临时状态：
- 预设布局方向修正后，2-2 现有校验器是错的，P4 改写。
- ~~旧引擎的 resize 每格移动 1%~~（旧引擎已在 P3 删除）。

## P3 切换到新引擎

- [x] `useTmuxSession`、`useKeyCapture` 接新引擎
- [x] 每关初始状态可加载的测试（`levels/__tests__/levels-load.test.ts`）
- [x] 删除 `tmux-engine.ts`、`command-parser.ts`、`keybinding-handler.ts`、`useTmuxEngine.ts` 及两份旧测试
- [x] `game/sim/simulate.ts`：`applyInput(state, input)`，UI 和测试共用的唯一入口（原定 P4，提前做了）
- [x] `i18n/format-error.ts`：错误码翻译成中英文，带“你是不是想输入…”
- [x] `TerminalView`（面板、状态栏、输出、命令行、提示行、编辑器）闯关页和挑战页共用
- [x] `types.ts` 删掉旧类型和 `@deprecated` 字段（`setOptions`、`sourcedFiles`、`cursorPosition`、`isZoomed`）

P3 结果：lint 0 错误、`tsc -b` 通过、`npm run build` 通过、测试 1003 → 1107 全过（46 个文件；其中删掉了已在 P2 移植过的 113 个旧测试）。浏览器实测（1280×720，英文界面）：1-1 输入 `tmux new -s work` 通关并存档；1-2 和挑战页按 `Ctrl+b %` 得到两个等宽并排面板，状态栏和命令行位置正常，控制台无报错。

P3 之后玩家能看到的变化：
- 被 tmux 拒绝的命令不再计入命令数；单按前缀键、打开提示行、复制模式里移动光标也不计。
- 重命名用 tmux 自己的提示行，不再弹 `window.prompt()`。
- 脱离会话后显示 tmux 外面的终端，不再是写死的 “[detached]”。
- 错误按界面语言显示，拼错命令时给出建议。
- 挑战模式里前缀快捷键可用了。
- 重试和换关是重新挂载一个终端，输出记录随之清空。

P3 没做、留给后面的：
- P4：关卡校验器还是旧逻辑。`levels-load` 测试记下的问题：2-2 开局即满足；1-10 只靠“至少一条命令”挡着；3-1 / 3-2 不检查选项和鼠标；1-4 关任意面板都过；2-4 真 join-pane 之后反而不过；3-4 初始没有 `~/.tmux.conf`；3-6 用 link-window 也过；3-7 要求每个窗口都改名。
- P5：界面上拖拽边框、编辑器 Ctrl+S、复制模式吞掉所有按键（非 mac 的 Ctrl+R 等）、不再使用的 i18n key（`game.commandError`、`game.didYouMean`、`game.enterWindowName`）、写死的速查条目、其余内联样式。
- P6：挑战页目标文字的语言跟 `user-store` 走，界面跟 i18n 检测器走，两者会不一致（实测英文界面下目标是中文）；难度仍固定为初级 60 秒。
- 核心层几处错误码细节，P4 写文案时一起处理：`copy.notInMode` 从未抛出；`session.nested` 也被 `attach-session` 使用；`parse.unknownFlag` / `parse.missingArg` 不带命令名；`parse.ambiguousCommand` 的 `matches` 是拼好的字符串。

## P4 关卡改写

- [x] `game/sim/simulate.ts`（P3 已完成）
- [ ] `levels/predicates.ts`
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

- **P0–P2**：见各节的“结果”。
- **P3**：界面已完全跑在新引擎上，旧引擎、旧解析器、旧按键处理器和它们的测试都删了。闯关页和挑战页共用一个 `TerminalView`，输入只走 `applyInput` 一条路，所以“算不算一条命令”“报什么错”两边一致。关卡校验器和文案没动，现在有些关卡比以前更容易或更难过（见 P3 “没做”一节），P4 修。浏览器里只测了 1-1、1-2 和挑战页初级的分屏，没测第三章的编辑器、复制模式和窄屏。
