import { useTranslation } from 'react-i18next'
import { cx } from '@/components/ui/cx'
import { filterReference } from '@/game/reference'
import type { ReferenceCategory } from '@/game/reference'
import { ReferenceEntryRow } from './ReferenceEntryRow'

export interface ReferenceListProps {
  /** Only entries matching this text are listed; empty lists everything. */
  query?: string
  /** A denser list for the in-game dialog. */
  compact?: boolean
}

function CategorySection({ category, compact }: { category: ReferenceCategory; compact: boolean }) {
  const { t } = useTranslation()
  const Heading = compact ? 'h3' : 'h2'
  const headingId = `reference-${compact ? 'compact-' : ''}${category.id}`
  return (
    <section aria-labelledby={headingId}>
      <div className={cx('flex items-center gap-3', compact ? 'mb-1' : 'mb-3')}>
        {!compact && (
          <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-control bg-accent-faint text-xl">
            {category.icon}
          </span>
        )}
        <div className="min-w-0">
          <Heading id={headingId} className={cx('font-display font-bold text-ink', compact ? 'text-sm' : 'text-lg')}>
            {t(`reference.categories.${category.id}`)}
          </Heading>
          {!compact && <p className="text-xs text-ink-muted">{t(`reference.descriptions.${category.id}`)}</p>}
        </div>
      </div>
      <ul className={compact ? 'divide-y divide-line' : 'grid gap-2 md:grid-cols-2'}>
        {category.entries.map(entry => <ReferenceEntryRow key={entry.id} entry={entry} compact={compact} />)}
      </ul>
    </section>
  )
}

/** The command reference, by category, narrowed to what matches `query`. */
export function ReferenceList({ query = '', compact = false }: ReferenceListProps) {
  const { t } = useTranslation()
  const categories = filterReference(query, entry => t(`reference.entries.${entry.id}`))
  return (
    <div
      data-testid="reference-list"
      data-query={query}
      data-compact={compact}
      className={cx('flex flex-col', compact ? 'gap-4' : 'gap-8')}
    >
      {categories.length === 0 && (
        <p className="py-8 text-center text-sm text-ink-muted">{t('reference.noResults', { query: query.trim() })}</p>
      )}
      {categories.map(category => <CategorySection key={category.id} category={category} compact={compact} />)}
    </div>
  )
}
