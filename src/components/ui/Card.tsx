import type { ComponentProps } from 'react'
import { cx } from './cx'

const SURFACE = 'rounded-card border border-line bg-surface shadow-card'

export function Card({ className, ...rest }: ComponentProps<'div'>) {
  return <div {...rest} className={cx(SURFACE, className)} />
}

/** A card that is one big button: the whole surface is the click target and it takes keyboard focus. */
export function CardButton({ className, ...rest }: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        SURFACE,
        'text-left transition enabled:hover:-translate-y-0.5 enabled:hover:border-line-strong enabled:hover:shadow-raised disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
    />
  )
}
