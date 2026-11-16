import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import SearchField from '../../components/ui/SearchField.jsx'
import EmptyState from '../../components/feedback/EmptyState.jsx'
import ErrorState from '../../components/feedback/ErrorState.jsx'
import { Skeleton } from '../../components/feedback/Skeleton.jsx'
import { ALL_SUBURBS } from '../joy/SuburbSelector.jsx'
import { useOnline } from '../../hooks/useOnline.js'
import { useSuburb } from '../../hooks/useSuburb.js'
import { fetchSuburbs } from '../../lib/data.js'
import { messages } from '../../lib/messages.js'
import ProductResultCard from './ProductResultCard.jsx'
import { useSearch } from './useSearch.js'

const DEFAULT_SUBURB_NAME = 'Hatfield'

/** S2 Search Results (#11, US1): every matching product with its price at each store, cheapest first. */
export default function SearchResults() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const online = useOnline()
  const searchRef = useRef(null)
  const [draft, setDraft] = useState(q)
  useEffect(() => setDraft(q), [q])

  // Same suburb as S1: the saved choice, else Hatfield. "All suburbs" searches everywhere.
  const [savedSuburbId] = useSuburb()
  const suburbs = useQuery({ queryKey: ['suburbs'], queryFn: fetchSuburbs, staleTime: Infinity })
  const suburbList = suburbs.data ?? []
  const fallback = suburbList.find((s) => s.name === DEFAULT_SUBURB_NAME) ?? suburbList[0]
  const chosen = savedSuburbId ?? fallback?.id ?? null
  const suburbId = chosen === ALL_SUBURBS ? null : chosen
  const suburbName = suburbList.find((s) => s.id === suburbId)?.name ?? 'all suburbs'

  const search = useSearch(suburbs.isPending ? '' : q, suburbId)

  function handleSubmit(event) {
    event.preventDefault()
    const term = draft.trim()
    if (!term) {
      searchRef.current?.focus()
      return
    }
    setParams({ q: term })
  }

  return (
    <div className="flex flex-col gap-4 pb-6 sm:gap-6">
      <h1 className="sr-only">Search results{q && ` for ${q}`}</h1>

      <form role="search" onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchField ref={searchRef} value={draft} onChange={setDraft} className="sm:flex-1" />
        <Button type="submit" className="w-full sm:w-auto">
          Search
        </Button>
      </form>

      <Results search={search} q={q} suburbName={suburbName} online={online} loading={suburbs.isPending} />
    </div>
  )
}

function Results({ search, q, suburbName, online, loading }) {
  if (!q.trim()) {
    return <EmptyState icon={Search}>Search for a product to compare prices at nearby stores.</EmptyState>
  }
  if (loading || search.isPending) return <ResultSkeletons />
  if (search.isError && search.results.length === 0) return <ErrorState onRetry={() => search.refetch()} />

  const count = `${search.total} ${search.total === 1 ? 'result' : 'results'}`

  return (
    <>
      <p className="text-caption text-muted sm:text-body" aria-live="polite">
        {online ? (
          <>
            <span className="font-medium text-ink">{count}</span> in {suburbName} • Sorted by lowest price
          </>
        ) : (
          <>Cached results • {suburbName}</>
        )}
      </p>

      {search.results.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-4 py-10 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-grey-pill-bg">
            <Search aria-hidden="true" className="size-5 text-muted" />
          </span>
          <p className="max-w-xs text-body text-muted">{messages.noSearchResults}</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4 sm:max-w-3xl sm:gap-6">
          {search.results.map((product) => (
            <ProductResultCard key={product.id} product={product} changed={search.changed} cached={!online} />
          ))}

          {search.hasNextPage && (
            <Button
              variant="secondary"
              className="self-center sm:min-w-40"
              disabled={search.isFetchingNextPage || !online}
              onClick={() => search.fetchNextPage()}
            >
              {search.isFetchingNextPage ? 'Loading…' : 'Load more'}
            </Button>
          )}
          {search.isFetchNextPageError && <ErrorState onRetry={() => search.fetchNextPage()} />}
        </div>
      )}
    </>
  )
}

/** Three skeleton cards, matching the Stitch loading frame. */
function ResultSkeletons() {
  return (
    <div role="status" aria-label="Loading search results" className="flex flex-col gap-4 sm:max-w-3xl">
      {Array.from({ length: 3 }, (_, i) => (
        <Card key={i} className="flex flex-col gap-4 p-4" aria-hidden="true">
          <div className="flex items-center gap-4">
            <Skeleton className="size-12 rounded-card" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-11 w-full rounded-button" />
        </Card>
      ))}
    </div>
  )
}
