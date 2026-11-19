import { useQuery } from '@tanstack/react-query'
import { fetchSavings } from './savingsApi.js'

/**
 * The logged-in shopper's savings dashboard data (S6).
 * `enabled: false` waits (no request) until we know someone is logged in.
 */
export function useSavings({ enabled = true } = {}) {
  return useQuery({ queryKey: ['savings'], queryFn: () => fetchSavings(), enabled })
}
