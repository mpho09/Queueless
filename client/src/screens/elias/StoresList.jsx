import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import ErrorState from '../../components/feedback/ErrorState.jsx'
import { SkeletonRows } from '../../components/feedback/Skeleton.jsx'
import { messages } from '../../lib/messages.js'
import { fetchStores } from './ReportApi.js'

/** Simple list of stores (route /stores, "Stores" in the nav). Each store opens its page, where shoppers can report. */
export default function StoresList() {
  const storesQuery = useQuery({ queryKey: ['stores'], queryFn: fetchStores })

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 pb-8">
      <h1 className="text-page-title font-bold text-ink">Stores</h1>

      {storesQuery.isPending && <SkeletonRows count={3} label="Loading stores" />}
      {storesQuery.isError && <ErrorState message={storesQuery.error?.message} onRetry={() => storesQuery.refetch()} />}
      {storesQuery.isSuccess && storesQuery.data.length === 0 && <p className="text-body text-muted">{messages.noStores}</p>}

      {storesQuery.isSuccess && storesQuery.data.length > 0 && (
        <ul className="flex flex-col gap-3">
          {storesQuery.data.map((store) => (
            <li key={store.id}>
              <Card as={Link} to={`/stores/${store.id}`} className="flex min-h-16 items-center justify-between gap-3 p-4 hover:border-primary">
                <span className="flex flex-col">
                  <span className="text-card-title font-semibold text-ink">{store.name}</span>
                  <span className="text-caption text-muted">
                    {store.address} · {store.opening_hours}
                  </span>
                </span>
                <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted" />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
