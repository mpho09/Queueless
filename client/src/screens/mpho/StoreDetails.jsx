import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { MapPinOff, Store } from 'lucide-react'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import StockBadge from '../../components/domain/StockBadge.jsx'
import PriceAgeBadge from '../../components/domain/PriceAgeBadge.jsx'
import AddToBasketButton from '../../components/domain/AddToBasketButton.jsx'
import EmptyState from '../../components/feedback/EmptyState.jsx'
import ErrorState from '../../components/feedback/ErrorState.jsx'
import Toast from '../../components/feedback/Toast.jsx'
import { SkeletonRows } from '../../components/feedback/Skeleton.jsx'
import Dialog from '../refilwe/Dialog.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { useOnline } from '../../hooks/useOnline.js'
import { formatDate, formatTime, formatZAR } from '../../lib/format.js'
import { fetchStoreDetails, STORE_NOT_FOUND } from './storeApi.js'
import QueuePanel from './QueuePanel.jsx'

/** S3 Store Details (#12). Route: /stores/:storeId */
export default function StoreDetails() {
  const { storeId } = useParams()
  const { pathname, state } = useLocation()
  const navigate = useNavigate()
  const online = useOnline()
  const { isLoggedIn } = useAuth()
  // S5 sends a thank-you toast (and maybe a location warning) back here after a report.
  const [toast, setToast] = useState(state?.toast ?? null)
  const [signInFor, setSignInFor] = useState(null)

  // Queue levels change by the minute, so always refetch when the page opens (e.g. right after a report).
  const query = useQuery({ queryKey: ['store', storeId], queryFn: () => fetchStoreDetails(storeId), staleTime: 0 })

  if (query.isPending) return <SkeletonRows count={4} label="Loading store" />
  if (query.isError) {
    if (query.error?.code === STORE_NOT_FOUND) {
      return (
        <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
          <EmptyState icon={Store}>This store could not be found.</EmptyState>
          <Button variant="secondary" to="/stores">See all stores</Button>
        </div>
      )
    }
    return <ErrorState onRetry={() => query.refetch()} />
  }

  const { store, queue, listings } = query.data

  function report(tab) {
    if (!isLoggedIn) {
      setSignInFor(tab)
      return
    }
    navigate(`/stores/${store.id}/report`, { state: { tab } })
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5 pb-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-page-title font-bold text-ink">{store.name}</h1>
        <p className="text-body text-muted">{store.address}</p>
        <p className="flex items-center gap-2 text-caption text-muted">
          <span aria-hidden="true" className="size-2 rounded-full bg-savings" />
          Open today {store.openingHours}
        </p>
      </header>

      {state?.warning && (
        <p role="status" className="flex items-center gap-2 rounded-card border border-amber/40 bg-amber-bg px-3 py-2 text-caption font-medium text-amber-text">
          <MapPinOff aria-hidden="true" className="size-4 shrink-0 text-amber" />
          {state.warning}
        </p>
      )}

      <QueuePanel queue={queue} offline={!online} />

      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" className="px-3" disabled={!online} onClick={() => report('price')}>
          Update Store Price
        </Button>
        <Button className="px-3" disabled={!online} onClick={() => report('queue')}>
          Report Queue Status
        </Button>
      </div>

      <section aria-labelledby="store-prices" className="flex flex-col gap-3">
        <h2 id="store-prices" className="text-section font-semibold text-ink">Prices at this store</h2>
        {listings.length === 0 ? (
          <EmptyState icon={Store}>No prices for this store yet.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {listings.map((l) => (
              <li key={l.listingId}>
                <Card className="flex flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-body font-medium text-ink">{l.name}</p>
                      <p className="text-caption text-muted">{[l.brand, l.size].filter(Boolean).join(' · ')}</p>
                    </div>
                    <p className="shrink-0 text-price font-bold text-ink" aria-label={`${formatZAR(l.price)} for ${l.name}`}>
                      {formatZAR(l.price)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <StockBadge status={l.stockStatus} />
                    <PriceAgeBadge verifiedAt={l.verifiedAt} />
                    <span className="text-caption text-muted">
                      {online ? 'Updated' : 'Cached'} {formatTime(l.verifiedAt)}, {formatDate(l.verifiedAt)}
                    </span>
                  </div>
                  <AddToBasketButton productId={l.productId} productName={l.name} className="self-end" />
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {signInFor && (
        <Dialog title="Sign in required" sheet onClose={() => setSignInFor(null)}>
          <p className="text-body text-muted">Log in to report queue or price updates.</p>
          <div className="mt-5 flex flex-col gap-3">
            <Button to="/login" state={{ from: pathname }}>Log in</Button>
            <Button variant="secondary" onClick={() => setSignInFor(null)}>Cancel</Button>
          </div>
        </Dialog>
      )}

      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  )
}
