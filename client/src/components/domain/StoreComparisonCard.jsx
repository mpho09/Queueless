import { useId, useState } from 'react'
import { Link } from 'react-router'
import { ChevronDown, ChevronRight, CircleAlert } from 'lucide-react'
import CheapestPill from './CheapestPill.jsx'
import MissingItemsPill from './MissingItemsPill.jsx'
import QueueBadge from './QueueBadge.jsx'
import { formatZAR } from '../../lib/format.js'
import { messages } from '../../lib/messages.js'

const FLAGGED_STOCK = new Set(['Out of Stock', 'Limited Stock'])

/**
 * One store in the S4 comparison (BR3): total, Cheapest / +difference / Missing pill,
 * queue level, and an item breakdown that opens and closes.
 * `cachedAt` (a time string) replaces the live queue badge while offline.
 */
export default function StoreComparisonCard({ store, itemCount, cachedAt }) {
  const [open, setOpen] = useState(false)
  const breakdownId = useId()

  const tone = store.cheapest
    ? 'border-2 border-savings'
    : store.complete
      ? 'border border-border'
      : 'border border-dashed border-amber bg-amber-bg/40'

  const toggleLabel = store.complete
    ? open
      ? 'Hide item breakdown'
      : 'View item breakdown'
    : `${open ? 'Hide' : 'View'} ${store.available.length} available ${store.available.length === 1 ? 'item' : 'items'}`

  return (
    <article className={`rounded-card bg-bg p-4 sm:p-6 ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <Link
            to={`/stores/${store.id}`}
            className="inline-flex items-center gap-1 text-card-title font-semibold text-ink hover:text-primary sm:text-[22px] sm:leading-7"
          >
            {store.name}
            <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted" />
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {store.cheapest && <CheapestPill />}
            {store.complete && !store.cheapest && store.difference !== null && (
              <span className="inline-flex shrink-0 items-center rounded-full border border-border px-3 py-1 text-caption font-medium text-ink">
                +{formatZAR(store.difference)}
              </span>
            )}
            {!store.complete && <MissingItemsPill count={store.missing.length} />}
            {cachedAt ? (
              <span className="inline-flex shrink-0 items-center rounded-full bg-grey-pill-bg px-3 py-1 text-caption font-medium text-muted">
                Queue: Cached {cachedAt}
              </span>
            ) : (
              <QueueBadge level={store.queueLevel} />
            )}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p
            className={`text-price font-bold sm:text-[36px] sm:leading-10 ${store.cheapest ? 'text-savings' : 'text-ink'}`}
          >
            {formatZAR(store.total)}
          </p>
          {!store.complete && (
            <p className="text-caption text-muted">
              {store.available.length} of {itemCount} items priced
            </p>
          )}
        </div>
      </div>

      {store.missing.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {store.missing.map((item) => (
            <li
              key={item.productId}
              className="flex items-start gap-2 rounded-card border border-amber/40 bg-amber-bg px-3 py-2 text-caption text-amber-text sm:text-body"
            >
              <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {item.name}: {messages.priceUnavailable}
            </li>
          ))}
        </ul>
      )}

      <div className={`mt-4 ${store.complete ? 'border-t border-border pt-2' : ''}`}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={breakdownId}
          onClick={() => setOpen((v) => !v)}
          className="flex min-h-11 w-full items-center justify-between gap-2 text-left text-caption font-semibold text-primary sm:text-body"
        >
          {toggleLabel}
          <ChevronDown aria-hidden="true" className={`size-5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div id={breakdownId} className="mt-2 rounded-card border border-border bg-surface-soft p-4">
            <ul aria-label="Item breakdown" className="flex flex-col gap-2 text-caption sm:text-body">
              {store.available.map((item) => (
                <li key={item.productId} className="flex items-start justify-between gap-3">
                  <span>
                    {item.name}
                    {item.quantity > 1 && <span className="text-muted"> × {item.quantity}</span>}
                    {FLAGGED_STOCK.has(item.stockStatus) && (
                      <span className="ml-2 text-caption font-medium text-amber-text">{item.stockStatus}</span>
                    )}
                  </span>
                  <span className="shrink-0">{formatZAR(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between gap-3 border-t border-border pt-3 font-semibold">
              <span>Store Total</span>
              <span className={store.cheapest ? 'text-savings' : ''}>{formatZAR(store.total)}</span>
            </div>
          </div>
        )}
      </div>
    </article>
  )
}
