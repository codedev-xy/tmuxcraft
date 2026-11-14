import type { TFunction } from 'i18next'
import type { ErrorParams, TmuxError } from '@/core/errors'

// Params hold user-typed text; React escapes on render, so i18next must not escape it too.
const RAW = { interpolation: { escapeValue: false } } as const

/** Params ready for interpolation, with lists joined by the separator of the current language. */
function textParams(t: TFunction, params: ErrorParams = {}): Record<string, string | number> {
  const separator = t('errors.listSeparator')
  return Object.fromEntries(Object.entries(params).map(([name, value]) => (
    [name, typeof value === 'object' ? value.join(separator) : value]
  )))
}

/** One line of user-facing text for an error, in the current language. */
export function formatError(t: TFunction, error: TmuxError): string {
  const base = t(`errors.${error.code}`, { ...textParams(t, error.params), ...RAW })
  const prefix = error.at ? `${error.at.path}:${error.at.line}: ` : ''
  const suffix = error.suggestion ? ` ${t('errors.didYouMean', { command: error.suggestion, ...RAW })}` : ''
  return `${prefix}${base}${suffix}`
}
