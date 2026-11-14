import { useTranslation } from 'react-i18next'
import type { StarRating as Stars } from '@/game/level-types'
import { countStars } from '@/game/scoring'
import { cx } from './cx'

const SIZES = { sm: 'text-sm', md: 'text-xl', lg: 'text-4xl' }

interface StarRatingProps {
  /** Null for a level not completed yet. */
  stars: Stars | null
  size?: keyof typeof SIZES
  className?: string
}

export function StarRating({ stars, size = 'sm', className }: StarRatingProps) {
  const { t } = useTranslation()
  const earned = stars ? [stars.completed, stars.efficient, stars.noHints] : [false, false, false]
  return (
    <span
      role="img"
      aria-label={t('common.starsEarned', { count: stars ? countStars(stars) : 0 })}
      className={cx('inline-flex gap-0.5 leading-none', SIZES[size], className)}
    >
      {earned.map((on, index) => (
        <span key={index} aria-hidden="true" className={on ? 'text-star' : 'text-star-off'}>★</span>
      ))}
    </span>
  )
}
