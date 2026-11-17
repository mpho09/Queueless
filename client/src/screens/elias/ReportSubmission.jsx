import { useId, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Ban, TriangleAlert } from 'lucide-react'
import Button from '../../components/ui/Button.jsx'
import Select from '../../components/ui/Select.jsx'
import Toast from '../../components/feedback/Toast.jsx'
import ErrorState from '../../components/feedback/ErrorState.jsx'
import { SkeletonRows } from '../../components/feedback/Skeleton.jsx'
import { useOnline } from '../../hooks/useOnline.js'
import { messages } from '../../lib/messages.js'
import { isValidPrice } from '../../utils/validation.js'
import { fetchListings, fetchStore } from './ReportApi.js'
import QueueTile from './QueueTile.jsx'
import useSubmitReport from './useSubmitReport.js'

const QUEUE_LEVELS = ['none', 'short', 'moderate', 'long']

// Labels shown to the shopper → the stock_status value saved in the database.
const STOCK_OPTIONS = [
  { label: 'In stock', value: 'In Stock' },
  { label: 'Low stock', value: 'Limited Stock' },
  { label: 'Out of stock', value: 'Out of Stock' },
]

const TABS = [
  { id: 'queue', label: 'Queue', title: 'Report Queue Status', subtext: 'Your report helps other shoppers skip long queues.' },
  { id: 'price', label: 'Price', title: 'Update Store Price', subtext: 'Submit observed in-store shelf prices for this branch.' },
  { id: 'stock', label: 'Stock', title: 'Report Stock Level', subtext: 'Tell other shoppers whether a product is on the shelf.' },
]

// Captions under Confirm (Stitch S5). The error messages themselves live in lib/messages.js.
const CAPTIONS = {
  queue: 'You can submit up to 5 queue reports per store per hour.',
  price: 'You can submit up to 3 price updates per store per hour.',
  stock: 'Price and stock reports share a limit of 3 updates per store per hour.',
}

const NOT_ALLOWED_BODY = 'Reporting queue or price updates is restricted to logged-in, email-verified Shoppers.'

/** S5: report the queue, a price or the stock level at a store. Route: /stores/:storeId/report */
export default function ReportSubmission() {
  const { storeId } = useParams()
  const online = useOnline()
  const priceId = useId()
  const priceErrorId = `${priceId}-error`

  const [tabId, setTabId] = useState('queue')
  const [queueLevel, setQueueLevel] = useState(null)
  const [listingId, setListingId] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState(null)

  const tab = TABS.find((t) => t.id === tabId)

  const storeQuery = useQuery({ queryKey: ['report-store', storeId], queryFn: () => fetchStore(storeId) })
  const listingsQuery = useQuery({
    queryKey: ['report-listings', storeId],
    queryFn: () => fetchListings(storeId),
    enabled: tabId !== 'queue',
  })

  const { submit, submitting, error, errorCode, clearError, limitReached, locationMismatch } = useSubmitReport({
    storeId,
    store: storeQuery.data,
  })

  const priceInvalid = price.trim() !== '' && !isValidPrice(price)
  // Price and Stock reports share one limit, so hitting it blocks both tabs.
  const limitHit = tabId === 'queue' ? limitReached.queue : limitReached.price
  const isLimitError = errorCode === 'QUEUE_LIMIT' || errorCode === 'PRICE_LIMIT'

  const ready = {
    queue: queueLevel !== null,
    price: listingId !== '' && isValidPrice(price),
    stock: listingId !== '' && stock !== null,
  }[tabId]
  const canConfirm = online && !submitting && !limitHit && ready

  function handleConfirm() {
    if (!canConfirm) return
    if (tabId === 'queue') submit({ reportType: 'Queue', value: queueLevel })
    if (tabId === 'price') submit({ reportType: 'Price', value: price.trim(), listingId })
    if (tabId === 'stock') submit({ reportType: 'Stock', value: stock, listingId })
  }

  const listingOptions = (listingsQuery.data ?? []).map((l) => ({ value: l.id, label: l.size ? `${l.name} ${l.size}` : l.name }))

  function renderProductPicker() {
    if (listingsQuery.isPending) return <SkeletonRows count={1} label="Loading products" />
    if (listingsQuery.isError) return <ErrorState message={listingsQuery.error?.message} onRetry={() => listingsQuery.refetch()} />
    if (listingOptions.length === 0) return <p className="text-body text-muted">No products are listed for this store yet.</p>
    return (
      <Select label="Product" placeholder="Choose a product" options={listingOptions} value={listingId} onChange={setListingId} />
    )
  }

  if (storeQuery.isPending) {
    return (
      <div className="mx-auto w-full max-w-xl">
        <SkeletonRows count={2} label="Loading store" />
      </div>
    )
  }

  if (storeQuery.isError) {
    return (
      <div className="mx-auto w-full max-w-xl">
        <ErrorState message={storeQuery.error?.message} onRetry={() => storeQuery.refetch()} />
      </div>
    )
  }

  // Stitch frame 6: a Retailer, an unverified or a logged-out user is not allowed to report.
  if (errorCode === 'FORBIDDEN') {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 rounded-card border border-border px-6 py-12 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-grey-pill-bg">
          <Ban aria-hidden="true" className="size-7 text-muted" />
        </span>
        <h1 className="text-section font-bold text-ink">{messages.forbidden}</h1>
        <p className="text-body text-muted">{NOT_ALLOWED_BODY}</p>
        <div className="mt-2 flex w-full flex-col gap-3">
          <Button to="/login">Log in to your account</Button>
          <Button to={`/stores/${storeId}`} variant="secondary">
            Return to store details
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 pb-8 sm:rounded-2xl sm:border sm:border-border sm:p-8 sm:shadow-sm">
      <div className="flex items-center gap-2">
        <Link
          to={`/stores/${storeId}`}
          aria-label="Go back to Store Details"
          className="-ml-2 flex size-11 items-center justify-center rounded-full text-ink hover:bg-grey-pill-bg"
        >
          <ArrowLeft aria-hidden="true" className="size-6" />
        </Link>
        <h1 className="text-section font-semibold text-ink">{tab.title}</h1>
      </div>

      <div>
        <h2 className="text-[22px] leading-7 font-bold text-ink">{storeQuery.data.name}</h2>
        <p className="mt-1 text-body text-muted">{tab.subtext}</p>
      </div>

      <div role="tablist" aria-label="Report type" className="grid grid-cols-3 gap-1 rounded-button bg-grey-pill-bg p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`report-tab-${t.id}`}
            aria-selected={t.id === tabId}
            aria-controls="report-panel"
            onClick={() => setTabId(t.id)}
            className={`min-h-11 rounded-button px-3 text-body font-medium transition-colors ${
              t.id === tabId ? 'bg-bg text-primary shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id="report-panel" aria-labelledby={`report-tab-${tabId}`} className="flex flex-col gap-4">
        {locationMismatch && (
          <div role="status" className="flex items-start gap-3 rounded-card border border-amber/40 bg-amber-bg px-4 py-3">
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-amber" />
            <div>
              <p className="text-body font-semibold text-amber-text">{messages.locationMismatch}</p>
              <p className="text-caption text-amber-text">
                You appear to be away from {storeQuery.data.name}. Your report will be saved, but marked as unverified for community review.
              </p>
            </div>
          </div>
        )}

        {tabId === 'queue' && (
          <div role="radiogroup" aria-label="Select current queue length" className="grid grid-cols-2 gap-3">
            {QUEUE_LEVELS.map((level) => (
              <QueueTile key={level} level={level} selected={queueLevel === level} onSelect={setQueueLevel} />
            ))}
          </div>
        )}

        {tabId !== 'queue' && renderProductPicker()}

        {tabId === 'price' && (
          <div>
            <label htmlFor={priceId} className="mb-2 block text-body font-medium text-ink">
              New price (R)
            </label>
            <input
              id={priceId}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              aria-invalid={priceInvalid}
              aria-describedby={priceInvalid ? priceErrorId : undefined}
              className={`min-h-12 w-full rounded-input border bg-bg px-3 text-body text-ink focus:border-primary ${
                priceInvalid ? 'border-red' : 'border-border'
              }`}
            />
            {priceInvalid && (
              <p id={priceErrorId} role="alert" className="mt-2 text-caption text-red">
                {messages.invalidPrice}
              </p>
            )}
          </div>
        )}

        {tabId === 'stock' && (
          <div>
            <span id="stock-label" className="mb-2 block text-body font-medium text-ink">
              Stock status
            </span>
            <div role="radiogroup" aria-labelledby="stock-label" className="flex flex-wrap gap-2">
              {STOCK_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={stock === option.value}
                  onClick={() => setStock(option.value)}
                  className={`min-h-11 rounded-button border-2 px-4 text-body font-medium transition-colors ${
                    stock === option.value ? 'border-primary bg-green-bg text-primary' : 'border-border bg-bg text-ink hover:border-primary/50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stitch frame 4: the limit message sits in red right above the disabled Confirm button. */}
        {isLimitError && (
          <p role="alert" className="text-center text-caption font-medium text-red">
            {error}
          </p>
        )}

        <Button onClick={handleConfirm} disabled={!canConfirm} aria-busy={submitting} className="w-full">
          {submitting ? 'Submitting…' : online ? 'Confirm' : 'Confirm (Offline)'}
        </Button>
        <p className="text-center text-caption text-muted">{CAPTIONS[tabId]}</p>
      </div>

      {!isLimitError && <Toast message={error} tone="error" onClose={clearError} />}
    </div>
  )
}
