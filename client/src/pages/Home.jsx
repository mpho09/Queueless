import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, MapPin, ShoppingCart } from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Select from '../components/ui/Select.jsx'
import SearchField from '../components/ui/SearchField.jsx'
import QueueBadge from '../components/domain/QueueBadge.jsx'
import EmptyState from '../components/feedback/EmptyState.jsx'
import ErrorState from '../components/feedback/ErrorState.jsx'
import { Skeleton, SkeletonRows } from '../components/feedback/Skeleton.jsx'
import { useOnline } from '../hooks/useOnline.js'
import { useSuburb } from '../hooks/useSuburb.js'
import { fetchNearbyStores, fetchSuburbs } from '../lib/data.js'
import { formatDateTime, formatTime } from '../lib/format.js'
import { messages } from '../lib/messages.js'

const ALL_SUBURBS = 'all'
const DEFAULT_SUBURB_NAME = 'Hatfield'

/** S1 Home (Search Landing): suburb selector, product search, active basket and nearby stores. */
export default function Home() {
  const navigate = useNavigate()
  const online = useOnline()
  const searchRef = useRef(null)
  const [query, setQuery] = useState('')
  const [savedSuburbId, setSuburbId] = useSuburb()

  const suburbs = useQuery({ queryKey: ['suburbs'], queryFn: fetchSuburbs, staleTime: Infinity })

  // First visit: start on Hatfield (the seeded suburb). "All suburbs" clears the filter.
  const suburbList = suburbs.data ?? []
  const fallback = suburbList.find((s) => s.name === DEFAULT_SUBURB_NAME) ?? suburbList[0]
  const suburbId = savedSuburbId ?? fallback?.id ?? null
  const filterId = suburbId === ALL_SUBURBS ? null : suburbId
  const suburb = suburbList.find((s) => s.id === filterId)

  const stores = useQuery({
    queryKey: ['nearby-stores', filterId],
    queryFn: () => fetchNearbyStores(filterId),
    enabled: suburbs.isSuccess,
  })

  function handleSearch(event) {
    event.preventDefault()
    const term = query.trim()
    if (!term) {
      searchRef.current?.focus()
      return
    }
    navigate(`/search?q=${encodeURIComponent(term)}`)
  }

  const showingText = `Showing stores in ${suburb ? suburb.name : 'all suburbs'}${online ? '' : ' (Cached)'}`

  const suburbSelect = (
    <Select
      label="Your suburb"
      value={suburbId ?? ''}
      onChange={(id) => setSuburbId(id || ALL_SUBURBS)}
      options={[
        ...suburbList.map((s) => ({ value: s.id, label: s.name })),
        { value: ALL_SUBURBS, label: 'All suburbs' },
      ]}
      disabled={suburbs.isPending}
      hint={suburbs.isSuccess ? showingText : undefined}
      hintIcon={<MapPin aria-hidden="true" className="size-4 shrink-0" />}
      className="sm:flex-1"
    />
  )

  return (
    <div className="flex flex-col gap-6 pb-6 sm:gap-12">
      <h1 className="text-card-title font-semibold sm:text-[40px] sm:leading-tight sm:font-bold">
        Find the cheapest store near you.
      </h1>

      <form
        role="search"
        onSubmit={handleSearch}
        className="-mt-2 flex flex-col gap-4 sm:mt-0 sm:flex-row sm:items-start sm:gap-5 sm:rounded-card sm:border sm:border-border sm:bg-surface-soft sm:p-8"
      >
        {suburbSelect}
        <div className="flex flex-col gap-4 sm:flex-[2] sm:flex-row sm:gap-5 sm:pt-9">
          <SearchField ref={searchRef} value={query} onChange={setQuery} className="sm:flex-[2]" />
          <Button type="submit" className="w-full sm:flex-1">
            {online ? 'Search' : 'Search (Offline)'}
          </Button>
        </div>
      </form>

      <div className="flex flex-col gap-6 sm:grid sm:grid-cols-[3fr_2fr] sm:gap-10">
        <section aria-labelledby="basket-heading" className="sm:order-2">
          <SectionHeading id="basket-heading">Your active basket</SectionHeading>
          <ActiveBasket loading={suburbs.isPending} />
        </section>

        <section aria-labelledby="stores-heading" className="sm:order-1">
          <SectionHeading
            id="stores-heading"
            aside={stores.isSuccess && <UpdatedAt timestamp={stores.dataUpdatedAt} />}
          >
            Nearby stores
          </SectionHeading>
          <NearbyStores
            query={stores}
            loading={suburbs.isPending || stores.isPending}
            error={suburbs.isError || stores.isError}
            onRetry={() => (suburbs.isError ? suburbs.refetch() : stores.refetch())}
            cached={!online}
          />
        </section>
      </div>
    </div>
  )
}

function SectionHeading({ id, aside, children }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-4 sm:mb-5 sm:border-b sm:border-border sm:pb-3">
      <h2 id={id} className="text-body font-semibold sm:text-[24px] sm:leading-8">
        {children}
      </h2>
      {aside}
    </div>
  )
}

function UpdatedAt({ timestamp }) {
  const justNow = Date.now() - timestamp < 60_000
  return (
    <p className="hidden text-body text-muted sm:block">
      {justNow ? 'Updated just now' : `Updated at ${formatTime(timestamp)}`}
    </p>
  )
}

/**
 * The basket summary ("3 items • Cheapest at …") needs the basket and BR3 totals,
 * which arrive with F2 (#16). Until then every shopper sees the empty basket state.
 */
function ActiveBasket({ loading }) {
  if (loading) {
    return (
      <Card className="flex items-start justify-between gap-4 p-4" aria-hidden="true">
        <div className="flex flex-1 flex-col gap-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <Skeleton className="h-6 w-14" />
      </Card>
    )
  }
  return <EmptyState icon={ShoppingCart}>{messages.emptyBasket}</EmptyState>
}

function NearbyStores({ query, loading, error, onRetry, cached }) {
  if (loading) return <SkeletonRows label="Loading nearby stores" />
  if (error) return <ErrorState onRetry={onRetry} />
  if (query.data.length === 0) return <EmptyState icon={MapPin}>{messages.noStores}</EmptyState>

  return (
    <ul aria-labelledby="stores-heading" className="flex flex-col gap-3 sm:gap-4">
      {query.data.map((store) => (
        <li key={store.id}>
          <Link
            to={`/stores/${store.id}`}
            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-card border border-border bg-bg p-3 hover:border-primary sm:p-6"
          >
            <div className="min-w-40 flex-1">
              <p className="truncate text-body font-medium text-ink sm:text-[22px] sm:leading-7 sm:font-semibold">
                {store.name}
              </p>
              <p className="truncate text-caption text-muted sm:mt-1 sm:text-body">
                {store.suburbName}
                {cached && ` • Cached ${formatDateTime(query.dataUpdatedAt)}`}
              </p>
            </div>
            <QueueBadge level={store.queueLevel} />
          </Link>
        </li>
      ))}
    </ul>
  )
}
