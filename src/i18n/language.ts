import { useTranslation } from 'react-i18next'

export type Language = 'zh' | 'en'

export const LANGUAGES: readonly Language[] = ['zh', 'en']

/** The language on screen and a way to change it. i18n is the one place it lives; it saves the choice itself. */
export function useLanguage(): readonly [Language, (language: Language) => void] {
  const { i18n } = useTranslation()
  const language: Language = i18n.resolvedLanguage === 'en' ? 'en' : 'zh'
  return [language, next => void i18n.changeLanguage(next)]
}
