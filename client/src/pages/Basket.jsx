import { useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { CircleCheck, Pencil, ShoppingBasket, Trash2 } from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import QuantityStepper from '../components/ui/QuantityStepper.jsx'
import StoreComparisonCard from '../components/domain/StoreComparisonCard.jsx'
import ErrorState from '../components/feedback/ErrorState.jsx'
import { SkeletonRows } from '../components/feedback/Skeleton.jsx'
import { useBasket } from '../hooks/useBasket.js'
import { useOnline } from '../hooks/useOnline.js'
import { fetchBasketPrices } from '../lib/data.js'
import { formatTime, formatZAR } from '../lib/format.js'
import { messages } from '../lib/messages.js'
import { basketTotals, chainName } from '../utils/basketTotals.js'

const iconButton =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-soft hover:text-ink disabled:cursor-not-allowed disabled:text-border disabled:hover:bg-transparent'

const itemsLabel = (n) => `${n} ${n === 1 ? 'item' : 'items'}`

/** S4 Shopping Basket: the basket's items and what the whole basket costs at each store (F2, BR3). */
export default function Basket() {
  const basket = useBasket()
  const online = useOnline()
  const productIds = useMemo(() => basket.items.map((i) => i.productId).sort(), [basket.items])

  const prices = useQuery({
    queryKey: ['basketPrices', productIds],
    queryFn: () => fetchBasketPrices(productIds),
    enabled: productIds.length > 0,
    placeholderData: keepPreviousData,
  })

  const totals = useMemo(
    () => (prices.data ? basketTotals(basket.items, prices.data) : null),
    [basket.items, prices.data],
  )
  const products = useMemo(() => new Map((prices.data?.products ?? []).map((p) => [p.id, p])), [prices.data])
  const cachedAt = online ? null : formatTime(prices.dataUpdatedAt || Date.now())

  const count = basket.items.length
  const countLabel = online ? itemsLabel(count) : `Cached (${itemsLabel(count)})`

  return (
    <div className="flex flex-col gap-6 pb-6 sm:grid sm:grid-cols-[2fr_3fr] sm:items-start sm:gap-10">
      <section aria-labelledby="basket-title" className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <BasketTitle title={basket.title} onRename={basket.rename} disabled={!online} />
          <span className="shrink-0 rounded-full border border-border bg-surface-soft px-3 py-1 text-caption text-muted">
            {countLabel}
          </span>
        </div>

        {count === 0 ? (
          <EmptyBasket />
        ) : prices.isPending ? (
          <SkeletonRows count={count} label="Loading your basket" />
        ) : (
          <ul aria-label="Basket items" className="flex flex-col gap-3">
            {basket.items.map((item) => {
              const product = products.get(item.productId)
              const name = product?.name ?? 'Product no longer available'
              return (
                <li key={item.productId}>
                  <Card className="flex items-center gap-3 p-3 sm:p-5">
                    <div className="min-w-0 flex-1">
                      <p className="text-body font-medium text-ink">{name}</p>
                      {product?.brand && (
                        <p className="text-caption text-muted">
                          {product.brand} • {product.size}
                        </p>
                      )}
                    </div>
                    <QuantityStepper
                      value={item.quantity}
                      label={name}
                      disabled={!online}
                      onChange={(q) => basket.setQuantity(item.productId, q)}
                    />
                    <button
                      type="button"
                      aria-label={`Remove ${name}`}
                      className={iconButton}
                      disabled={!online}
                      onClick={() => basket.remove(item.productId)}
                    >
                      <Trash2 aria-hidden="true" className="size-5" />
                    </button>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {count > 0 && (
        <section aria-labelledby="compare-heading" className="flex flex-col gap-4">
          {prices.isPending ? (
            <SkeletonRows count={3} label="Loading store totals" />
          ) : prices.isError ? (
            <ErrorState onRetry={() => prices.refetch()} />
          ) : (
            <>
              <SavingsBanner totals={totals} cached={!online} />
              <h2 id="compare-heading" className="text-section font-semibold sm:text-[24px] sm:leading-8">
                {online ? 'Compare stores' : 'Compare stores (Cached)'}
              </h2>
              {totals.stores.length === 0 ? (
                <p className="text-body text-muted">None of the stores we know of sell these items yet.</p>
              ) : (
                <ul aria-label="Compare stores" className="flex flex-col gap-4">
                  {totals.stores.map((store) => (
                    <li key={store.id}>
                      <StoreComparisonCard store={store} itemCount={count} cachedAt={cachedAt} />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      )}
    </div>
  )
}

function BasketTitle({ title, onRename, disabled }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title)

  function start() {
    setDraft(title)
    setEditing(true)
  }
  function save() {
    onRename(draft)
    setEditing(false)
  }

  if (editing && !disabled) {
    return (
      <form
        className="flex min-w-0 flex-1"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <input
          aria-label="Basket name"
          autoFocus
          maxLength={60}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
          className="min-h-11 w-full min-w-0 rounded-input border border-primary px-3 text-section font-bold text-ink outline-none"
        />
      </form>
    )
  }

  return (
    <div className="flex min-w-0 items-center gap-1">
      <h1 id="basket-title" className="truncate text-page-title font-bold sm:text-[32px] sm:leading-10">
        {title}
      </h1>
      <button type="button" aria-label="Rename basket" className={iconButton} disabled={disabled} onClick={start}>
        <Pencil aria-hidden="true" className="size-5" />
      </button>
    </div>
  )
}

function SavingsBanner({ totals, cached }) {
  // No banner for a tie: "saving R0.00" isn't a saving.
  if (!totals?.cheapest || !(totals.saving > 0)) return null
  const chain = chainName(totals.cheapest)
  const saving = <strong className="font-semibold text-savings">{formatZAR(totals.saving)}</strong>
  return (
    <div className="flex items-start gap-3 rounded-card border border-savings/30 border-l-4 border-l-savings bg-green-bg p-4 text-body text-ink">
      <CircleCheck aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-savings" />
      {cached ? (
        <p>
          Cached comparison: Saving {saving} at {chain} today.
        </p>
      ) : (
        <p>
          Great choice! You are saving {saving} on this basket selection by choosing {chain} today.
        </p>
      )}
    </div>
  )
}

function EmptyBasket() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-card border border-border bg-surface-soft px-4 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-grey-pill-bg">
        <ShoppingBasket aria-hidden="true" className="size-6 text-muted" />
      </span>
      <p className="max-w-64 text-body text-ink">{messages.emptyBasket}</p>
      <Button to="/" className="w-full max-w-xs">
        Search products
      </Button>
    </div>
  )
}
