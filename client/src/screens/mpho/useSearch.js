import { useEffect, useState } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase.js'
import { fetchSearchPage, PAGE_SIZE } from './searchApi.js'

/** How long a live-updated price stays highlighted blue. */
export const HIGHLIGHT_MS = 5000

/**
 * Search results for S2, 10 at a time ("Load more" fetches the next page).
 * Also listens for live price changes and returns the ids of listings that just changed;
 * each id is removed again after HIGHLIGHT_MS, so the blue highlight fades back to normal.
 */
export function useSearch(q, suburbId) {
  const queryClient = useQueryClient()
  const [changed, setChanged] = useState(() => new Set())

  const query = useInfiniteQuery({
    queryKey: ['search', q, suburbId],
    queryFn: ({ pageParam }) => fetchSearchPage({ q, suburbId, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.length * PAGE_SIZE
      return loaded < lastPage.total ? loaded : undefined
    },
    enabled: Boolean(q?.trim()),
  })

  // Live price updates (Supabase Realtime on listings): refetch and highlight the changed row
  // for a few seconds.
  useEffect(() => {
    if (!supabase || !q?.trim()) return undefined
    const timers = new Map() // listing id → its "stop highlighting" timer
    const channel = supabase
      .channel('search-listings')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'listings' }, (payload) => {
        const id = payload.new?.id
        if (id) {
          setChanged((prev) => new Set(prev).add(id))
          // A second change to the same price restarts its timer.
          clearTimeout(timers.get(id))
          timers.set(
            id,
            setTimeout(() => {
              timers.delete(id)
              setChanged((prev) => {
                const next = new Set(prev)
                next.delete(id)
                return next
              })
            }, HIGHLIGHT_MS),
          )
        }
        queryClient.invalidateQueries({ queryKey: ['search'] })
      })
      .subscribe()
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
      supabase.removeChannel(channel)
    }
  }, [q, queryClient])

  const results = query.data?.pages.flatMap((page) => page.results) ?? []
  const total = query.data?.pages[0]?.total ?? 0

  return { ...query, results, total, changed }
}
