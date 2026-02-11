import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/store/game-store'
import { useUserStore } from '@/store/user-store'

// ─── Command data ───

interface Command {
  category: string
  shortcut: string
  cmd: string
  desc: string
  descZh: string
  popular?: boolean
}

const COMMANDS: Command[] = [
  { category: 'session', shortcut: 'tmux new -s name', cmd: 'new-session', desc: 'Create a new named session', descZh: '创建一个命名会话', popular: true },
  { category: 'session', shortcut: 'tmux attach -t name', cmd: 'attach', desc: 'Attach to a session', descZh: '附加到一个会话', popular: true },
  { category: 'session', shortcut: 'tmux ls', cmd: 'list-sessions', desc: 'List all sessions', descZh: '列出所有会话' },
  { category: 'session', shortcut: 'Ctrl+b d', cmd: 'detach', desc: 'Detach from current session', descZh: '从当前会话分离', popular: true },
  { category: 'session', shortcut: 'Ctrl+b s', cmd: 'list-sessions', desc: 'Show session picker', descZh: '显示会话选择器' },
  { category: 'window', shortcut: 'Ctrl+b c', cmd: 'new-window', desc: 'Create a new window', descZh: '创建新窗口', popular: true },
  { category: 'window', shortcut: 'Ctrl+b n', cmd: 'next-window', desc: 'Go to next window', descZh: '切换到下一个窗口', popular: true },
  { category: 'window', shortcut: 'Ctrl+b p', cmd: 'previous-window', desc: 'Go to previous window', descZh: '切换到上一个窗口' },
  { category: 'window', shortcut: 'Ctrl+b 0-9', cmd: 'select-window', desc: 'Select window by number', descZh: '按编号选择窗口' },
  { category: 'window', shortcut: 'Ctrl+b ,', cmd: 'rename-window', desc: 'Rename current window', descZh: '重命名当前窗口' },
  { category: 'pane', shortcut: 'Ctrl+b "', cmd: 'split-horizontal', desc: 'Split pane horizontally (top/bottom)', descZh: '水平分割面板（上/下）', popular: true },
  { category: 'pane', shortcut: 'Ctrl+b %', cmd: 'split-vertical', desc: 'Split pane vertically (left/right)', descZh: '垂直分割面板（左/右）', popular: true },
  { category: 'pane', shortcut: 'Ctrl+b Arrow', cmd: 'select-pane', desc: 'Navigate between panes', descZh: '在面板间导航', popular: true },
  { category: 'pane', shortcut: 'Ctrl+b x', cmd: 'close-pane', desc: 'Close current pane', descZh: '关闭当前面板' },
  { category: 'pane', shortcut: 'Ctrl+b z', cmd: 'zoom-pane', desc: 'Toggle pane zoom', descZh: '切换面板缩放' },
  { category: 'pane', shortcut: 'Ctrl+b Ctrl+Arrow', cmd: 'resize-pane', desc: 'Resize pane', descZh: '调整面板大小' },
  { category: 'pane', shortcut: 'Ctrl+b { / }', cmd: 'swap-pane', desc: 'Swap pane positions', descZh: '交换面板位置' },
  { category: 'pane', shortcut: 'Ctrl+b !', cmd: 'break-pane', desc: 'Break pane to new window', descZh: '将面板拆分为新窗口' },
  { category: 'pane', shortcut: 'Ctrl+b Space', cmd: 'next-layout', desc: 'Cycle through layouts', descZh: '循环切换布局' },
  { category: 'copy', shortcut: 'Ctrl+b [', cmd: 'enter-copy-mode', desc: 'Enter copy mode', descZh: '进入复制模式' },
  { category: 'copy', shortcut: 'Ctrl+b ]', cmd: 'paste', desc: 'Paste from buffer', descZh: '从缓冲区粘贴' },
  { category: 'config', shortcut: ':set -g prefix C-a', cmd: 'set-option', desc: 'Change prefix key', descZh: '更改前缀键' },
  { category: 'config', shortcut: ':bind-key h split-window -h', cmd: 'bind-key', desc: 'Create custom key binding', descZh: '创建自定义快捷键' },
  { category: 'config', shortcut: ':set -g mouse on', cmd: 'set-option', desc: 'Enable mouse mode', descZh: '启用鼠标模式' },
  { category: 'config', shortcut: ':source-file ~/.tmux.conf', cmd: 'source-file', desc: 'Reload config file', descZh: '重新加载配置文件' },
]

const CATEGORIES = ['session', 'window', 'pane', 'copy', 'config']

const CATEGORY_EMOJI: Record<string, string> = {
  session: '\uD83D\uDCBB',
  window: '\uD83E\uDDF1',
  pane: '\uD83D\uDD33',
  copy: '\uD83D\uDCCB',
  config: '\u2699\uFE0F',
}

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; accent: string }> = {
  session: { bg: 'rgba(139,92,246,0.06)', border: 'rgba(139,92,246,0.2)', text: '#7c3aed', accent: 'rgba(139,92,246,0.1)' },
  window: { bg: 'rgba(14,165,233,0.06)', border: 'rgba(14,165,233,0.2)', text: '#0284c7', accent: 'rgba(14,165,233,0.1)' },
  pane: { bg: 'rgba(34,197,94,0.06)', border: 'rgba(34,197,94,0.2)', text: '#16a34a', accent: 'rgba(34,197,94,0.1)' },
  copy: { bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.2)', text: '#d97706', accent: 'rgba(245,158,11,0.1)' },
  config: { bg: 'rgba(139,92,246,0.06)', border: 'rgba(139,92,246,0.2)', text: '#7c3aed', accent: 'rgba(139,92,246,0.1)' },
}

// ─── Shortcut renderer: parses key combos into <kbd> tags ───

function ShortcutDisplay({ shortcut }: { shortcut: string }) {
  // Split by spaces but keep multi-word tokens like "Ctrl+b" together
  if (shortcut.startsWith('tmux ') || shortcut.startsWith(':')) {
    // CLI command or colon command — render as code block
    return (
      <code
        className="font-[family-name:var(--font-mono)] text-sm"
        style={{ color: '#0284c7' }}
      >
        {shortcut}
      </code>
    )
  }

  // Key sequence like "Ctrl+b d" or "Ctrl+b Ctrl+Arrow"
  const parts = shortcut.split(' ')
  return (
    <span className="flex items-center gap-1 flex-wrap">
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>+</span>}
          <kbd
            className="font-[family-name:var(--font-mono)] text-xs font-semibold rounded-md border"
            style={{
              padding: '2px 8px',
              background: '#f1f5f9',
              borderColor: '#e2e8f0',
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
              color: '#0ea5e9',
            }}
          >
            {part}
          </kbd>
        </span>
      ))}
    </span>
  )
}

// ─── Main ReferenceScreen ───

export function ReferenceScreen() {
  const { t } = useTranslation()
  const setScreen = useGameStore(s => s.setScreen)
  const language = useUserStore(s => s.language)
  const [search, setSearch] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => new Set(CATEGORIES))
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null)
  const isZh = language === 'zh'

  const toggleCategory = useCallback((cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }, [])

  const handleCopy = useCallback(async (shortcut: string) => {
    try {
      await navigator.clipboard.writeText(shortcut)
      setCopiedCmd(shortcut)
      setTimeout(() => setCopiedCmd(null), 1500)
    } catch {
      // Fallback: silently fail
    }
  }, [])

  // Filter commands by search
  const getFilteredByCategory = (category: string) => {
    return COMMANDS.filter(cmd => {
      if (cmd.category !== category) return false
      if (search) {
        const q = search.toLowerCase()
        return cmd.shortcut.toLowerCase().includes(q) || cmd.cmd.toLowerCase().includes(q) || cmd.desc.toLowerCase().includes(q) || cmd.descZh.toLowerCase().includes(q)
      }
      return true
    })
  }

  // Check if any category has results for search
  const categoriesWithResults = CATEGORIES.filter(cat => getFilteredByCategory(cat).length > 0)

  return (
    <div className="flex flex-col h-screen" style={{ background: '#f0f4ff' }}>
      {/* Header */}
      <div
        className="flex items-center gap-4 shrink-0"
        style={{
          padding: '1rem 1.5rem',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        <button
          onClick={() => setScreen('home')}
          className="font-[family-name:var(--font-ui)] font-semibold cursor-pointer"
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            color: '#1e293b',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = '#e2e8f0'
            el.style.borderColor = '#cbd5e1'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = '#f1f5f9'
            el.style.borderColor = '#e2e8f0'
          }}
        >
          &larr; {t('common.back')}
        </button>
        <h1 className="font-[family-name:var(--font-pixel)] text-xl" style={{ color: '#0ea5e9' }}>
          {'\uD83D\uDCD6'} {t('reference.title')}
        </h1>
      </div>

      {/* Search bar */}
      <div className="flex justify-center shrink-0" style={{ padding: '1.25rem 1.5rem 0.75rem' }}>
        <div className="max-w-4xl w-full relative">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`\uD83D\uDD0D ${t('reference.search')}`}
            className="w-full border-2 rounded-xl font-[family-name:var(--font-ui)] text-base outline-none transition-all"
            style={{
              padding: '0.75rem 1.25rem',
              background: '#f8fafc',
              borderColor: '#e2e8f0',
              color: '#1e293b',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = '#0ea5e9'
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(14,165,233,0.15)'
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = '#e2e8f0'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
        </div>
      </div>

      {/* Commands by category */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '0.5rem 1.5rem 1.5rem' }}>
        <div className="max-w-4xl w-full" style={{ margin: '0 auto' }}>
          {categoriesWithResults.map(cat => {
            const commands = getFilteredByCategory(cat)
            const colors = CATEGORY_COLORS[cat]
            const isExpanded = expandedCategories.has(cat)

            return (
              <div key={cat} style={{ marginBottom: '1rem' }}>
                {/* Category header — clickable to expand/collapse */}
                <button
                  onClick={() => toggleCategory(cat)}
                  className="w-full flex items-center gap-3 cursor-pointer transition-all"
                  style={{
                    padding: '1rem 1.25rem',
                    background: colors.bg,
                    border: `2px solid ${colors.border}`,
                    borderRadius: isExpanded ? '20px 20px 0 0' : '20px',
                  }}
                >
                  <span className="text-2xl">{CATEGORY_EMOJI[cat]}</span>
                  <div className="flex-1 text-left">
                    <div className="font-[family-name:var(--font-pixel)] text-lg font-bold" style={{ color: colors.text }}>
                      {t(`reference.categories.${cat}`)}
                    </div>
                    <div className="font-[family-name:var(--font-ui)] text-xs" style={{ color: colors.text, opacity: 0.7 }}>
                      {t(`reference.descriptions.${cat}`)}
                    </div>
                  </div>
                  <span className="font-[family-name:var(--font-ui)] text-xs font-semibold rounded-full" style={{
                    padding: '0.25rem 0.75rem',
                    background: colors.accent,
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                  }}>
                    {t('reference.commandCount', { count: commands.length })}
                  </span>
                  <motion.span
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-lg"
                    style={{ color: colors.text }}
                  >
                    {'\u25BC'}
                  </motion.span>
                </button>

                {/* Collapsible command cards */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div
                        className="grid grid-cols-1 md:grid-cols-2 border-2 border-t-0"
                        style={{
                          gap: '0.75rem',
                          padding: '1rem',
                          borderColor: colors.border,
                          background: '#ffffff',
                          borderRadius: '0 0 20px 20px',
                        }}
                      >
                        {commands.map((cmd, i) => (
                          <motion.div
                            key={cmd.shortcut}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            onClick={() => handleCopy(cmd.shortcut)}
                            className="rounded-xl border cursor-pointer group relative"
                            style={{
                              padding: '1rem 1.25rem',
                              background: '#ffffff',
                              borderColor: '#e2e8f0',
                              borderWidth: '1px',
                              borderStyle: 'solid',
                              borderRadius: '14px',
                              transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                            }}
                            onMouseEnter={e => {
                              const el = e.currentTarget as HTMLElement
                              el.style.transform = 'translateY(-2px)'
                              el.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)'
                              el.style.borderColor = '#cbd5e1'
                            }}
                            onMouseLeave={e => {
                              const el = e.currentTarget as HTMLElement
                              el.style.transform = 'translateY(0)'
                              el.style.boxShadow = 'none'
                              el.style.borderColor = '#e2e8f0'
                            }}
                          >
                            {/* Popular badge */}
                            {cmd.popular && (
                              <span
                                className="absolute font-[family-name:var(--font-ui)] text-xs font-bold"
                                style={{
                                  top: '0.5rem',
                                  right: '0.5rem',
                                  color: '#f59e0b',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                }}
                              >
                                {'\u2B50'}
                              </span>
                            )}

                            {/* Shortcut */}
                            <div style={{ marginBottom: '0.5rem' }}>
                              <ShortcutDisplay shortcut={cmd.shortcut} />
                            </div>

                            {/* Description */}
                            <p
                              className="font-[family-name:var(--font-ui)]"
                              style={{ fontSize: '0.8125rem', lineHeight: '1.4', color: '#64748b' }}
                            >
                              {isZh ? cmd.descZh : cmd.desc}
                            </p>

                            {/* Copy tooltip */}
                            <span
                              className="absolute font-[family-name:var(--font-ui)] text-xs font-semibold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                              style={{
                                bottom: '0.5rem',
                                right: '0.75rem',
                                padding: '2px 8px',
                                background: copiedCmd === cmd.shortcut ? '#22c55e' : '#0ea5e9',
                                color: '#ffffff',
                                borderRadius: '6px',
                                boxShadow: copiedCmd === cmd.shortcut
                                  ? '0 2px 8px rgba(34, 197, 94, 0.3)'
                                  : '0 2px 8px rgba(14, 165, 233, 0.3)',
                              }}
                            >
                              {copiedCmd === cmd.shortcut ? t('reference.copied') : t('reference.clickToCopy')}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
