import { useQuery } from '@tanstack/react-query'
import { fetchSavings } from './savingsApi.js'

/** The logged-in shopper's savings dashboard data (S6). */
export function useSavings() {
  return useQuery({ queryKey: ['savings'], queryFn: () => fetchSavings() })
}
