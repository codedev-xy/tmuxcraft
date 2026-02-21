import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGameStore } from '@/store/game-store'
import { useUserStore } from '@/store/user-store'
import { useProgressStore } from '@/store/progress-store'

export function SettingsScreen() {
  const { t, i18n } = useTranslation()
  const setScreen = useGameStore(s => s.setScreen)
  const { language, setLanguage } = useUserStore()
  const resetProgress = useProgressStore(s => s.resetProgress)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleLanguageChange = (lang: 'zh' | 'en') => {
    setLanguage(lang)
    i18n.changeLanguage(lang)
  }

  const isZh = language === 'zh'

  return (
    <div
      className="flex flex-col h-screen relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #f0f0ff 50%, #f0f4ff 100%)' }}
    >
      {/* ─── Decorative background blob ─── */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          bottom: '-6%',
          left: '-3%',
          width: '25%',
          height: '25%',
          background: 'radial-gradient(circle, rgba(100,116,139,0.08) 0%, transparent 70%)',
          filter: 'blur(50px)',
          animation: 'float-slow 10s ease-in-out infinite',
        }}
      />
      <div className="absolute inset-0 bg-dots opacity-[0.03] pointer-events-none" />

      {/* Header */}
      <div
        className="flex items-center gap-4 shrink-0 relative z-10 glass"
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid rgba(226,232,240,0.8)',
          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
        }}
      >
        <button
          onClick={() => setScreen('home')}
          className="font-[family-name:var(--font-ui)] font-semibold text-sm cursor-pointer transition-all"
          style={{
            padding: '8px 16px',
            borderRadius: '10px',
            background: '#ffffff',
            color: '#64748b',
            border: '1px solid #e2e8f0',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#cbd5e1'
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.06)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = '#e2e8f0'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          &larr; {t('common.back')}
        </button>
        <h1
          className="font-[family-name:var(--font-pixel)] text-xl"
          style={{ color: '#64748b' }}
        >
          {'\u2699\uFE0F'} {t('settings.title')}
        </h1>
      </div>

      <div
        className="flex-1 flex items-start justify-center overflow-y-auto relative z-10"
        style={{ padding: '32px 32px' }}
      >
        <div className="max-w-2xl w-full" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Command Reference Card */}
          <div
            style={{
              padding: '24px 32px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
              transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
              cursor: 'pointer',
            }}
            onClick={() => setScreen('reference')}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(14,165,233,0.15)'
              e.currentTarget.style.borderColor = 'rgba(14,165,233,0.3)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.06)'
              e.currentTarget.style.borderColor = '#e2e8f0'
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <label
                  className="block text-lg font-[family-name:var(--font-pixel)]"
                  style={{ marginBottom: '4px', color: '#0284c7' }}
                >
                  {'\uD83D\uDCD6'} {t('reference.title')}
                </label>
                <p className="font-[family-name:var(--font-ui)] text-sm" style={{ color: '#64748b' }}>
                  {isZh ? '查看所有 tmux 命令和快捷键' : 'View all tmux commands and shortcuts'}
                </p>
              </div>
              <span className="text-xl" style={{ color: '#94a3b8' }}>{'\u2192'}</span>
            </div>
          </div>

          {/* Language Card */}
          <div
            style={{
              padding: '24px 32px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
              transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(14,165,233,0.12)'
              e.currentTarget.style.borderColor = 'rgba(14,165,233,0.3)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.06)'
              e.currentTarget.style.borderColor = '#e2e8f0'
            }}
          >
            <label
              className="block text-lg font-[family-name:var(--font-pixel)]"
              style={{ marginBottom: '16px', color: '#1e293b' }}
            >
              {'\uD83C\uDF10'} {t('settings.language')}
            </label>
            <div className="flex gap-3">
              {(['zh', 'en'] as const).map(lang => (
                <button
                  key={lang}
                  onClick={() => handleLanguageChange(lang)}
                  className="flex-1 text-base font-[family-name:var(--font-ui)] font-semibold rounded-xl transition-all cursor-pointer"
                  style={{
                    padding: '14px 16px',
                    background: language === lang
                      ? 'linear-gradient(135deg, #0ea5e9, #0284c7)'
                      : '#f8fafc',
                    color: language === lang ? '#ffffff' : '#1e293b',
                    border: language === lang
                      ? '1px solid #0ea5e9'
                      : '1px solid #e2e8f0',
                    boxShadow: language === lang
                      ? '0 4px 16px rgba(14, 165, 233, 0.25)'
                      : '0 1px 4px rgba(0, 0, 0, 0.04)',
                  }}
                >
                  {lang === 'zh' ? '\uD83C\uDDE8\uD83C\uDDF3 \u4E2D\u6587' : '\uD83C\uDDEC\uD83C\uDDE7 English'}
                </button>
              ))}
            </div>
          </div>

          {/* About Card */}
          <div
            style={{
              padding: '24px 32px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
              transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(100,116,139,0.12)'
              e.currentTarget.style.borderColor = 'rgba(100,116,139,0.3)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.06)'
              e.currentTarget.style.borderColor = '#e2e8f0'
            }}
          >
            <label
              className="block text-lg font-[family-name:var(--font-pixel)]"
              style={{ marginBottom: '16px', color: '#1e293b' }}
            >
              {'\uD83D\uDCE6'} {isZh ? '\u5173\u4E8E' : 'About'}
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="flex items-center justify-between">
                <span className="font-[family-name:var(--font-ui)] text-sm" style={{ color: '#64748b' }}>
                  {isZh ? '\u5E94\u7528\u540D\u79F0' : 'App Name'}
                </span>
                <span className="font-[family-name:var(--font-pixel)] text-sm font-bold" style={{ color: '#1e293b' }}>
                  TmuxCraft
                </span>
              </div>
              <div style={{ height: '1px', background: '#f1f5f9' }} />
              <div className="flex items-center justify-between">
                <span className="font-[family-name:var(--font-ui)] text-sm" style={{ color: '#64748b' }}>
                  {isZh ? '\u7248\u672C' : 'Version'}
                </span>
                <span className="font-[family-name:var(--font-ui)] text-sm font-semibold" style={{ color: '#1e293b' }}>
                  1.0.0
                </span>
              </div>
              <div style={{ height: '1px', background: '#f1f5f9' }} />
              <div className="flex items-center justify-between">
                <span className="font-[family-name:var(--font-ui)] text-sm" style={{ color: '#64748b' }}>
                  {isZh ? '\u5173\u5361\u603B\u6570' : 'Total Levels'}
                </span>
                <span className="font-[family-name:var(--font-ui)] text-sm font-semibold" style={{ color: '#1e293b' }}>
                  26
                </span>
              </div>
              <div style={{ height: '1px', background: '#f1f5f9' }} />
              <p
                className="font-[family-name:var(--font-ui)] text-xs leading-relaxed"
                style={{ color: '#94a3b8', marginTop: '4px' }}
              >
                {isZh
                  ? '\u901A\u8FC7\u4EA4\u4E92\u5F0F\u95EF\u5173\u5B66\u4E60 tmux \u7EC8\u7AEF\u590D\u7528\u5668\u3002\u5305\u542B 3 \u4E2A\u7AE0\u8282\u3001\u6311\u6218\u6A21\u5F0F\u548C\u547D\u4EE4\u624B\u518C\u3002'
                  : 'Learn tmux terminal multiplexer through interactive levels. Includes 3 chapters, challenge mode, and command reference.'}
              </p>
            </div>
          </div>

          {/* Reset Card */}
          <div
            style={{
              padding: '24px 32px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '16px',
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
            }}
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <label
                  className="block text-lg font-[family-name:var(--font-pixel)]"
                  style={{ marginBottom: '6px', color: '#dc2626' }}
                >
                  {'\u26A0\uFE0F'} {isZh ? '\u5371\u9669\u533A' : 'Danger Zone'}
                </label>
                <p
                  className="font-[family-name:var(--font-ui)] text-sm"
                  style={{ color: '#64748b' }}
                >
                  {isZh ? '\u6B64\u64CD\u4F5C\u4E0D\u53EF\u64A4\u9500\uFF0C\u6240\u6709\u8FDB\u5EA6\u5C06\u88AB\u6E05\u9664' : 'This cannot be undone. All progress will be lost.'}
                </p>
              </div>
              <button
                onClick={() => setShowConfirm(true)}
                className="text-sm font-[family-name:var(--font-ui)] font-semibold rounded-xl transition-all cursor-pointer"
                style={{
                  padding: '12px 24px',
                  background: 'transparent',
                  color: '#dc2626',
                  border: '1px solid #fca5a5',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#fef2f2'
                  e.currentTarget.style.borderColor = '#f87171'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderColor = '#fca5a5'
                }}
              >
                {t('settings.resetProgress')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{
            background: 'rgba(0, 0, 0, 0.3)',
          }}
        >
          <div
            className="max-w-md text-center"
            style={{
              padding: '40px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              boxShadow: '0 25px 80px rgba(0, 0, 0, 0.12), 0 4px 24px rgba(0, 0, 0, 0.06)',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>{'\u26A0\uFE0F'}</div>
            <p
              className="font-[family-name:var(--font-ui)] text-lg leading-relaxed"
              style={{ marginBottom: '32px', color: '#1e293b' }}
            >
              {t('settings.resetConfirm')}
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setShowConfirm(false)}
                className="text-base font-[family-name:var(--font-ui)] font-semibold rounded-xl cursor-pointer transition-all"
                style={{
                  padding: '12px 24px',
                  background: '#ffffff',
                  color: '#1e293b',
                  border: '1px solid #e2e8f0',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#cbd5e1'
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.06)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#e2e8f0'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                {t('settings.cancel')}
              </button>
              <button
                onClick={() => { resetProgress(); setShowConfirm(false) }}
                className="text-base font-[family-name:var(--font-ui)] font-semibold rounded-xl transition-all cursor-pointer"
                style={{
                  padding: '12px 24px',
                  background: 'transparent',
                  color: '#dc2626',
                  border: '1px solid #fca5a5',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#fef2f2'
                  e.currentTarget.style.borderColor = '#f87171'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderColor = '#fca5a5'
                }}
              >
                {t('settings.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
