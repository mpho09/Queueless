import { useEffect, useState } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase.js'
import { fetchSearchPage, PAGE_SIZE } from './searchApi.js'

/**
 * Search results for S2, 10 at a time ("Load more" fetches the next page).
 * Also listens for live price changes and returns the ids of listings that just changed.
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

  // Live price updates (Supabase Realtime on listings): refetch and highlight the changed row.
  useEffect(() => {
    if (!supabase || !q?.trim()) return undefined
    const channel = supabase
      .channel('search-listings')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'listings' }, (payload) => {
        const id = payload.new?.id
        if (id) setChanged((prev) => new Set(prev).add(id))
        queryClient.invalidateQueries({ queryKey: ['search'] })
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [q, queryClient])

  const results = query.data?.pages.flatMap((page) => page.results) ?? []
  const total = query.data?.pages[0]?.total ?? 0

  return { ...query, results, total, changed }
}
