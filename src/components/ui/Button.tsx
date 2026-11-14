import type { ComponentProps } from 'react'
import { cx } from './cx'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'success' | 'warning' | 'danger' | 'chapter' | 'dark' | 'dark-ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

const BASE = 'inline-flex shrink-0 items-center justify-center gap-2 rounded-control font-ui font-bold transition disabled:cursor-not-allowed disabled:opacity-50'

const FILLED = 'text-white shadow-card enabled:hover:brightness-110 enabled:active:brightness-95'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: `bg-accent-deep ${FILLED}`,
  success: `bg-success-strong ${FILLED}`,
  warning: `bg-warning-strong ${FILLED}`,
  danger: `bg-danger-strong ${FILLED}`,
  chapter: `bg-chapter-strong ${FILLED}`,
  secondary: 'border border-line bg-surface text-ink-soft enabled:hover:border-line-strong enabled:hover:shadow-card',
  ghost: 'text-ink-muted enabled:hover:bg-surface-sunken enabled:hover:text-ink',
  dark: 'border border-term-line-strong bg-term-raised text-term-text enabled:hover:bg-term-line-strong',
  'dark-ghost': 'text-term-muted enabled:hover:bg-term-raised enabled:hover:text-term-text',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

const ICON_SIZES: Record<ButtonSize, string> = {
  sm: 'size-7 text-sm',
  md: 'size-9 text-base',
  lg: 'size-11 text-lg',
}

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function Button({ variant = 'secondary', size = 'md', className, ...rest }: ButtonProps) {
  return <button type="button" {...rest} className={cx(BASE, VARIANTS[variant], SIZES[size], className)} />
}

export interface IconButtonProps extends ButtonProps {
  /** What the button does; an icon alone says nothing to a screen reader. */
  label: string
}

export function IconButton({ label, variant = 'ghost', size = 'md', className, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      title={label}
      {...rest}
      aria-label={label}
      className={cx(BASE, VARIANTS[variant], ICON_SIZES[size], className)}
    />
  )
}
