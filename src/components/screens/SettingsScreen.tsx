import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGameStore } from '@/store/game-store'
import { useUserStore } from '@/store/user-store'
import { useProgressStore } from '@/store/progress-store'

export function SettingsScreen() {
  const { t, i18n } = useTranslation()
  const setScreen = useGameStore(s => s.setScreen)
  const { username, setUsername, language, setLanguage, soundEnabled, toggleSound } = useUserStore()
  const resetProgress = useProgressStore(s => s.resetProgress)
  const [showConfirm, setShowConfirm] = useState(false)
  const [nameInput, setNameInput] = useState(username)

  const handleLanguageChange = (lang: 'zh' | 'en') => {
    setLanguage(lang)
    i18n.changeLanguage(lang)
  }

  return (
    <div
      className="flex flex-col h-screen"
      style={{ background: '#f0f4ff' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-4 shrink-0"
        style={{
          padding: '20px 32px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        }}
      >
        <button
          onClick={() => setScreen('home')}
          className="text-base font-[family-name:var(--font-ui)] font-semibold rounded-xl cursor-pointer transition-all"
          style={{
            padding: '10px 20px',
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
          &larr; {t('common.back')}
        </button>
        <h1
          className="font-[family-name:var(--font-pixel)] text-2xl"
          style={{ color: '#0ea5e9' }}
        >
          {'\u2699\uFE0F'} {t('settings.title')}
        </h1>
      </div>

      <div
        className="flex-1 flex justify-center overflow-y-auto"
        style={{ padding: '32px 32px' }}
      >
        <div className="max-w-4xl w-full" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Username Card */}
          <div
            style={{
              padding: '32px 40px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
            }}
          >
            <label
              className="block text-xl font-[family-name:var(--font-pixel)]"
              style={{ marginBottom: '20px', color: '#1e293b' }}
            >
              {'\uD83D\uDC64'} {t('settings.username')}
            </label>
            <div className="flex gap-4">
              <input
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                className="flex-1 rounded-xl font-[family-name:var(--font-ui)] text-lg outline-none transition-all"
                style={{
                  padding: '16px 24px',
                  background: '#f8fafc',
                  border: '2px solid #e2e8f0',
                  color: '#1e293b',
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = '#0ea5e9'
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(14, 165, 233, 0.15)'
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = '#e2e8f0'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
              <button
                onClick={() => setUsername(nameInput)}
                className="text-lg font-[family-name:var(--font-ui)] font-semibold rounded-xl cursor-pointer border-0 transition-all"
                style={{
                  padding: '16px 32px',
                  background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                  color: '#ffffff',
                  boxShadow: '0 2px 8px rgba(14, 165, 233, 0.25)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(14, 165, 233, 0.35)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(14, 165, 233, 0.25)'
                }}
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>

          {/* Language + Sound: two-column grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Language Card */}
            <div
              style={{
                padding: '32px 40px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
              }}
            >
              <label
                className="block text-xl font-[family-name:var(--font-pixel)]"
                style={{ marginBottom: '20px', color: '#1e293b' }}
              >
                {'\uD83C\uDF10'} {t('settings.language')}
              </label>
              <div className="flex gap-4">
                {(['zh', 'en'] as const).map(lang => (
                  <button
                    key={lang}
                    onClick={() => handleLanguageChange(lang)}
                    className="flex-1 text-lg font-[family-name:var(--font-ui)] font-semibold rounded-xl transition-all cursor-pointer"
                    style={{
                      padding: '16px 20px',
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
                    {lang === 'zh' ? '\uD83C\uDDE8\uD83C\uDDF3 \u4E2D\u6587' : '\uD83C\uDDEC\uD83C\uDDE7 EN'}
                  </button>
                ))}
              </div>
            </div>

            {/* Sound Card */}
            <div
              style={{
                padding: '32px 40px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
              }}
            >
              <label
                className="block text-xl font-[family-name:var(--font-pixel)]"
                style={{ marginBottom: '20px', color: '#1e293b' }}
              >
                {'\uD83D\uDD0A'} {t('settings.sound')}
              </label>
              <button
                onClick={toggleSound}
                className="w-full text-lg font-[family-name:var(--font-ui)] font-semibold rounded-xl transition-all cursor-pointer"
                style={{
                  padding: '16px 20px',
                  background: soundEnabled
                    ? '#dcfce7'
                    : '#f8fafc',
                  color: soundEnabled ? '#16a34a' : '#1e293b',
                  border: soundEnabled
                    ? '1px solid #86efac'
                    : '1px solid #e2e8f0',
                  boxShadow: soundEnabled
                    ? '0 2px 8px rgba(34, 197, 94, 0.1)'
                    : '0 1px 4px rgba(0, 0, 0, 0.04)',
                }}
              >
                {soundEnabled ? `\uD83D\uDD0A ${t('settings.soundOn')}` : `\uD83D\uDD07 ${t('settings.soundOff')}`}
              </button>
            </div>
          </div>

          {/* Reset Card */}
          <div
            style={{
              padding: '32px 40px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '16px',
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
            }}
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <label
                  className="block text-xl font-[family-name:var(--font-pixel)]"
                  style={{ marginBottom: '8px', color: '#dc2626' }}
                >
                  {'\u26A0\uFE0F'} {language === 'zh' ? '\u5371\u9669\u533A' : 'Danger Zone'}
                </label>
                <p
                  className="font-[family-name:var(--font-ui)] text-base"
                  style={{ color: '#64748b' }}
                >
                  {language === 'zh' ? '\u6B64\u64CD\u4F5C\u4E0D\u53EF\u64A4\u9500\uFF0C\u6240\u6709\u8FDB\u5EA6\u5C06\u88AB\u6E05\u9664' : 'This cannot be undone. All progress will be lost.'}
                </p>
              </div>
              <button
                onClick={() => setShowConfirm(true)}
                className="text-base font-[family-name:var(--font-ui)] font-semibold rounded-xl transition-all cursor-pointer"
                style={{
                  padding: '16px 32px',
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
