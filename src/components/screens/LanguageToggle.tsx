import { useTranslation } from 'react-i18next'
import { cx } from '@/components/ui/cx'
import { useUserStore } from '@/store/user-store'

const LANGUAGES = [
  { code: 'zh', name: '中文' },
  { code: 'en', name: 'EN' },
] as const

export function LanguageToggle() {
  const { t, i18n } = useTranslation()
  const setLanguage = useUserStore(s => s.setLanguage)
  const current = i18n.resolvedLanguage === 'en' ? 'en' : 'zh'

  return (
    <div role="group" aria-label={t('home.language')} className="flex gap-0.5 rounded-pill border border-line bg-surface p-1 shadow-card">
      {LANGUAGES.map(({ code, name }) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-pressed={current === code}
          onClick={() => {
            setLanguage(code)
            void i18n.changeLanguage(code)
          }}
          className={cx(
            'rounded-pill px-3 py-1 text-xs font-bold transition',
            current === code ? 'bg-accent-deep text-white' : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
          )}
        >
          {name}
        </button>
      ))}
    </div>
  )
}
