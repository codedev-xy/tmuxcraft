import type { TFunction } from 'i18next'
import type { TmuxError } from '@/core/errors'

// Params hold user-typed text; React escapes on render, so i18next must not escape it too.
const RAW = { interpolation: { escapeValue: false } } as const

/** One line of user-facing text for an error, in the current language. */
export function formatError(t: TFunction, error: TmuxError): string {
  const base = t(`errors.${error.code}`, { ...error.params, ...RAW })
  const prefix = error.at ? `${error.at.path}:${error.at.line}: ` : ''
  const suffix = error.suggestion ? ` ${t('errors.didYouMean', { command: error.suggestion, ...RAW })}` : ''
  return `${prefix}${base}${suffix}`
}
