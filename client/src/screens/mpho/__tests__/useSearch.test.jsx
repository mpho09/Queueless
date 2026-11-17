import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HIGHLIGHT_MS, useSearch } from '../useSearch.js'

// A fake Supabase client whose Realtime channel lets the test send a "price changed" event.
let mockSendUpdate = null
jest.mock('../../../lib/supabase.js', () => {
  const channel = {
    on(_type, _filter, handler) {
      mockSendUpdate = handler
      return channel
    },
    subscribe: () => channel,
  }
  return {
    isDev: true,
    supabase: {
      channel: () => channel,
      removeChannel: jest.fn(),
      rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
    },
  }
})

function wrapper({ children }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => jest.useFakeTimers())
afterEach(() => jest.useRealTimers())

test('a live price change is highlighted, then the highlight clears after a few seconds', () => {
  const { result } = renderHook(() => useSearch('sugar', null), { wrapper })

  act(() => mockSendUpdate({ new: { id: 'listing-1' } }))
  expect(result.current.changed.has('listing-1')).toBe(true)

  act(() => jest.advanceTimersByTime(HIGHLIGHT_MS - 1))
  expect(result.current.changed.has('listing-1')).toBe(true)

  act(() => jest.advanceTimersByTime(1))
  expect(result.current.changed.has('listing-1')).toBe(false)
})

test('a second change to the same price keeps it highlighted for the full time again', () => {
  const { result } = renderHook(() => useSearch('sugar', null), { wrapper })

  act(() => mockSendUpdate({ new: { id: 'listing-1' } }))
  act(() => jest.advanceTimersByTime(HIGHLIGHT_MS - 1000))
  act(() => mockSendUpdate({ new: { id: 'listing-1' } }))

  act(() => jest.advanceTimersByTime(HIGHLIGHT_MS - 1))
  expect(result.current.changed.has('listing-1')).toBe(true)

  act(() => jest.advanceTimersByTime(1))
  expect(result.current.changed.has('listing-1')).toBe(false)
})
