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
- [x] `levels/predicates.ts`（布局形状、日志查询 `ran` / `ranInOrder`，查询可按来源、按键、所在文件、命令行的词来匹配）
- [x] 关卡表测试（`levels.test.ts`，每关 7 项）：初始不过关 / 空操作不过关 / 参考解法每步有效 / 参考解法过关 / 步数等于 `optimalSteps` / 解法的任何前半段都不过关 / 分步引导按顺序勾上
- [x] 每章的捷径测试（`chapter1/2/3.test.ts`）：审计和复查列出的每个“最省事过关法”不再过关，合理的其他做法仍然过关
- [x] i18n 测试：中英 key 一致，关卡引用的 key 都存在
- [x] 第一章 11 关
- [x] 第二章 8 关
- [x] 第三章 7 关（含编辑器文件）
- [x] `zh.json` / `en.json` 文案同步改写
- [x] `tutorialSteps` 渲染为分步引导（`Walkthrough.tsx`）

P4 结果：lint 0 错误、`tsc -b` 通过、`npm run build` 通过、测试 1107 → 1532 全过（54 个文件）。`src/core` + `src/game` 覆盖率：语句 93.31% / 分支 90.5% / 函数 94.22% / 行 94.35%（阈值 80%）。

浏览器实测（1280×800，英文界面，控制台无报错），四关都三星通关：
- 1-5：四次前缀键分出 2×2，4 步（最优 4）。
- 2-5：先 `clear` 再 `cat secret.txt`，然后复制模式选中整行、切到右侧面板粘贴，6 步（最优 4，多出的是那两条命令）。
- 3-2：鼠标关闭时点击右侧面板无效；`:set -g mouse on` 后点击选中，2 步（最优 2）。
- 3-7：编辑器写 `~/.tmux.conf` 和 `~/work.sh`，`bash ~/work.sh` 后前两个目标勾上，`Ctrl+a |` 分屏，6 步（最优 6）。
- 没在浏览器里测的：3-4、3-5（编辑器流程由 3-7 覆盖，关卡本身只有自动测试）、中文界面、窄屏、拖拽边框。

P4 之后玩家能看到的变化：
- 26 关的目标、提示、分步引导全部重写，写明校验器检查的名称和数值；多数关卡不能再用旁门过关。
- 最优步数与方案表不同的几关（以关卡表测试实际跑通为准）：1-11 是 5，2-5 是 4（单按前缀键不计步），2-8 是 7，3-6 是 1，3-7 是 6。
- 编辑器点保存后自动关闭。
- tmux 服务器启动时（没有任何会话时的第一条 `new-session`）自动读取 `~/.tmux.conf`，所以 3-7 的脚本只需两行；配置在服务器启动之后才写的，用 `source-file` 加载。
- `split-window` / `new-window` / `new-session` 接受 `-c 目录`，但忽略它（模拟器没有当前目录）。
- 2-5 的 `secret.txt` 是真文件，清屏后可以 `cat secret.txt` 再打印出来。

复查发现并已修的问题（每个都先写了失败的测试）：
- 能绕过的：2-7 把 `default` 改名成 `dev` 再新建 `default`；2-8 把开局会话改名成 `debug`；2-5 粘贴别的内容再手打密码；3-1 / 3-7 把前缀临时改回 `C-b` 去按 `|`；3-6 先 `swap-window` 再移动别的窗口；3-7 让脚本分 `main`、自己的键去分别的窗口。
- 做对了却不过的：2-5 清屏后重新打印；2-6 广播后清屏、`echo "deploy"` 带引号或多空格；3-1 绑定里带 `-c`；3-3 样式用空格分隔；3-5 命令后多一个空格；3-7 脚本不写 `source-file`。
- 文案和校验不一致的：3-4 “由文件设置”原先也接受来自别的文件的设置，现在要求是 `~/.tmux.conf` 里的行。
- 为此核心层的日志多记了几项：每条命令所在的文件（`file`）、`move-window` 的窗口 ID 和来源会话、`paste-buffer` 粘贴的文字。

已知并接受的遗留（不影响正常通关）：
- 第一章用 `Ctrl+b x` / `Ctrl+b &` 关错面板或窗口会卡关，只能点重试；真实 tmux 这两个键会先问一句确认。建议 P5 加确认提示。
- 3-1：再用 `bind -n |` 在根表也绑一份，不按前缀直接按 `|` 也算（日志分不清根表和前缀表的绑定）。
- 1-5 用 `select-layout tiled` 也能得到 2×2；2-6 同步开启时用 `send-keys` 发命令也算；2-7 / 2-8 用 `:new` 比参考解法少一步。
- `kill-server` 之后选项和按键表不清空（真实 tmux 会清空）；保留是为了让“按日志追踪前缀”的判断准确。
- 调整大小每格是窗口的 1%，不是按 80×24 的字符格算。

凭记忆实现、没有对照真实 tmux 核实的两处：
- 启动配置在第一个会话建好之后执行（模拟器里 `set` / `bind` 需要已有服务器）。真实 tmux 应该是先读配置再执行启动它的那条命令；对 `set` / `bind` 结果相同。
- `status-style` 的各项既可用逗号也可用空格分隔。

P4 没做、留给后面的：
- P3 记下的核心层错误码细节仍未处理（`copy.notInMode` 从未抛出；`session.nested` 也被 `attach-session` 使用；`parse.unknownFlag` / `parse.missingArg` 不带命令名；`parse.ambiguousCommand` 的 `matches` 是拼好的字符串），移到 P5 和错误文案一起改。
- 项目 `CLAUDE.md` 对核心层和关卡层的描述已经过时，P7 重写。

## P5 UI 系统化

- [x] `globals.css` 设计变量、`:focus-visible`、`prefers-reduced-motion`
- [x] `src/components/ui/`：Button、IconButton、ScreenHeader、PageBackground、Card、ProgressBar、StarRating、Dialog、Kbd、Pill、Stat、Confetti（Toast 没做：没有两处以上要用的地方）
- [x] 全部页面改用变量和组件
- [x] `GameScreen.tsx` 拆分（`LevelPlay` + `useLevelPlay` + `PlayLayout`，挑战页共用外壳和终端）
- [x] 配置编辑器、鼠标模式、状态栏渲染、复制模式显示
- [x] 交互修复：前缀命令回显、前缀徽标、行内重命名、`tmux ls` 输出、提示扣星逻辑
- [x] 响应式布局
- [x] 首页“继续游戏”和手册入口；硬编码字符串进 i18n（挑战生成器的目标文字除外，P6 处理）
- [x] 浏览器实测（`/browse`）

P5 结果：lint 0 错误、`tsc -b` 通过、`npm run build` 通过、测试 1532 → 1804 全过（76 个文件）。`src/core` + `src/game` 覆盖率：语句 93.45% / 分支 90.83% / 函数 94.56% / 行 94.58%。

浏览器实测（中文界面为主，1280×800 和 390×800，控制台无报错）：
- 首页、章节页、关卡页、设置页、手册页、挑战选择页：显示正常；390 宽无横向溢出；首页按 Tab 依次到每个按钮，焦点框可见，回车能进设置。
- 1-1：看一条提示后通关，得两星（无提示星未得）；速查弹窗打开时命令框停用，Esc 关闭。
- 1-4：`Ctrl+b →`、`Ctrl+b x` 出现 `kill-pane 1? (y/n)`，按 `y` 后两步三星，分步引导按顺序勾上。
- 3-4：编辑器写三行、Ctrl+S 保存并关闭、`:source-file`、`Ctrl+a r`，四步三星。
- 3-2：鼠标关闭时边框不可拖；开启后拖动边框一次只记一条 `resize-pane`，点击右侧面板后通关。
- 2-5：复制模式徽标、光标和选区显示正常。
- 设置页重置弹窗：默认焦点在“取消”，Esc 关闭后焦点回到触发按钮（英文界面）。
- 没在浏览器里测的：3-5、挑战模式完整一局、结果弹窗、Firefox / Safari。

P5 之后玩家能看到的变化：
- 所有页面换成同一套颜色、圆角、阴影和按钮；键盘焦点始终可见；系统开了“减少动态效果”时动画关闭。
- 首页有“继续：下一关”按钮、总进度和中 / EN 切换；关卡不再上锁，下一关有标记。
- 关卡内：提示不再有免费的第一条，按需逐条查看，看任何一条都失去“无提示”星，界面上写明；统计卡显示离“高效”星还剩几条命令。
- `Ctrl+b x` / `Ctrl+b &` 先问 y/n（和真实 tmux 一样）；直接输入 `kill-pane` 不问。
- 复制模式只接管它自己的键，Tab 和未绑定的 Ctrl / Alt 组合键交还浏览器。
- 手册的条目来自一张表，表里每一条都有测试保证能在模拟器里执行；可按按键、命令名或说明搜索。
- 设置页的版本号读 `package.json`（现在是 0.0.0，P7 改成 2.0.0）。

实现中发现并修掉的：
- 旧 `globals.css` 里不在任何 layer 中的 `* { margin: 0; padding: 0 }` 压过了所有 Tailwind 的内外边距类（`px-3` 实测 0px）。现在文件里的规则全部在 layer 内。
- 手册测试里关闭面板 / 窗口的条目用按键 `y` 回答确认，实际没有关掉任何东西却通过了；改成提示行输入并加了“确实关掉”的断言。
- 手册搜索 `split` 找不到 `Ctrl+b %`；按键条目现在也能按它默认绑定的命令搜到。
- 设置页重置说明还提到已删除的成就。
- 删掉 11 个不再使用的 i18n key；“高效”星的步数上限只在 `scoring.ts` 定义一次。

P5 没做、留给后面的：
- P6：挑战选择页显示 60 / 90 / 120 秒三档，但点哪一档开始的都是初级 60 秒；挑战目标文字不走 i18n；`progress-store` 里的 `CHAPTER_SIZES`、`getChapterProgress`、`achievements` 已无页面使用；首页和设置页切换语言时同时写 `i18n` 和 `user-store`。
- 组件测试运行时有 React `act()` 警告（不影响结果）。
- 窄屏下复制模式、提示行这类依赖实体键盘的操作没有触屏替代。

## P6 挑战模式、存档、语言

- [x] 难度真正生效（60 / 90 / 120 秒），快捷键可用
- [x] 校验器检查分屏方向；生成器接受随机种子
- [x] 选择页显示最佳成绩；删除 `leaderboard.ts`
- [x] `progress-store` v3 迁移保留进度（测试先行）
- [x] 语言设置统一为一个来源

结果：82 个测试文件 / 1899 个测试通过；`tsc -b`、`eslint .`、`npm run build` 无错误；覆盖率语句 98.1%、分支 95.1%。

做了什么：
- **挑战目标**：一个目标是一组任务（`ChallengeTask`：i18n key + 参数 + 校验函数）加一份参考解法。文字用 `t(key, params)` 现场翻译，切换语言立即跟着变。三档各有自己的题型：初级 2–3 个命名窗口（单面板 / 左右 / 上下）；中级五选一（等宽行、等高列、2×2 网格、同步、放大）；高级两个命名会话加一个全局选项。
- **生成器测试**：每档 100 个种子，逐一检查：同种子同题、开局不满足、参考解法每步都成功且跑完才满足、步数在上限内、把分屏方向反过来不过、多一个面板不过、中英文案齐全且占位符都有值。
- **挑战页**：难度存在 `game-store`，时限按难度取；目标卡逐条列任务并实时打勾；结果弹窗列出完成和未完成的任务，破纪录时显示“新纪录！”（和最佳持平不算）。
- **存档**：`tmuxcraft-progress` 升到 v3。迁移逐条校验旧存档，保留关卡进度和挑战记录，去掉成就等字段，读不懂的条目单独丢弃而不是整份清空。
- **语言**：只剩 i18n 一个来源（`useLanguage()`），`user-store` 删除；`<html lang>` 跟随当前语言。

浏览器实测（1280×720，控制台无报错）：
- 种一份 v2 存档（2 关 4 星 + 1 条挑战记录 + 成就）后刷新：首页显示 2/26 关、4 颗星、“继续：1-3”，存档变为 v3 且只剩两个字段。
- 初级（中文）：时钟 1:00，4 条命令完成，任务逐条打勾，弹窗显示“新纪录！”，选择页最佳成绩由 33 秒更新为 12 秒。
- 中级（英文）：时钟 1:30，最后一步用 `Ctrl+b z` 完成。高级（英文）：时钟 2:00，6 个任务，7 条命令完成（含 `new-session -d`、`split-window -t home:db`、`set -g`）。
- 初级放着不做完：最后 10 秒时钟变红，到 0 弹出“时间到”，列出未完成任务，命令框停用，不新增记录。
- 390 宽：页头换行，终端在上、目标卡在下，无横向溢出。

实测中的一次误报：第一次种的 v2 存档漏了 `completed` 字段，关卡进度被迁移当作读不懂的条目丢弃。真实 v2 存档由旧 `completeLevel` 写出，一定带这个字段；按真实形状重种后保留正常。迁移代码没有改。

没做 / 没测的：
- 参考解法只用于测试，界面上没有“看答案”。
- 旧挑战记录里的 `targetDescription`（旧版生成的中文目标文字）原样保留但不再显示。
- 没在 Firefox / Safari 里测。

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
- **P4**：26 关的校验器、参考解法、文案全部重写，每关带一份可执行的参考解法，关卡表测试保证“开局不过、解法能过、步数对得上、半途不过、引导按序勾”。校验仍然只看状态，但借助命令日志能判断“是不是脚本建的”“是不是用自定义键分的”“设置来自哪个文件”。写完后又逐关复查了捷径和误判，查出的问题（列在 P4 一节）都先补失败测试再修。浏览器里测了 1-5、2-5、3-2、3-7；3-4、3-5、中文界面和窄屏没有在浏览器里测。有两处行为是凭记忆实现的（见 P4 一节），没有对照真实 tmux。
- **P6**：挑战模式三档现在是三种不同的题，各有自己的时限，题目文字跟界面语言走，快捷键可用，校验看的是具体形状而不是面板数。旧存档升级时进度和记录都保留。三档各在浏览器里完整玩了一局，另测了一次超时和一次 v2 存档升级。
