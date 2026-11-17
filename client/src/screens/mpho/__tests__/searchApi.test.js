import { fetchSearchPage, searchSample } from '../searchApi.js'

// Control what searchApi reads from lib/supabase.js: development or live, and whether Supabase is set up.
let mockIsDev = true
let mockRpc = null
jest.mock('../../../lib/supabase.js', () => ({
  get isDev() {
    return mockIsDev
  },
  get supabase() {
    return mockRpc ? { rpc: mockRpc } : null
  },
}))

afterEach(() => {
  mockIsDev = true
  mockRpc = null
})

describe('sample search (development)', () => {
  test('T-US1-1: "White Sugar 2kg" finds it with store prices lowest first', () => {
    const { results, total } = searchSample({ q: 'White Sugar 2kg' })
    expect(total).toBe(1)
    expect(results[0].name).toBe('White Sugar 2kg')
    expect(results[0].listings.map((l) => [l.storeName, l.price])).toEqual([
      ['Shoprite Hatfield', 42.99],
      ['Pick n Pay Hatfield', 44.99],
    ])
  })

  test('matching ignores case and also checks the brand', () => {
    expect(searchSample({ q: 'white sugar' }).total).toBe(1)
    expect(searchSample({ q: 'clover' }).results[0].name).toBe('Clover Full Cream Milk 2L')
  })

  test('T-US1-2: no match returns no results', () => {
    expect(searchSample({ q: 'Quinoa Organic 1kg' })).toEqual({ results: [], total: 0 })
  })

  test('products are ordered by their cheapest price', () => {
    const prices = searchSample({ q: 'l' }).results.map((p) => p.listings[0].price)
    expect(prices).toEqual([...prices].sort((a, b) => a - b))
  })

  test('the suburb filter drops stores outside it', () => {
    expect(searchSample({ q: 'sugar', suburbId: 'sample-arcadia' }).total).toBe(0)
    expect(searchSample({ q: 'sugar', suburbId: 'sample-hatfield' }).total).toBe(1)
  })

  test('the 3-day-old Pick n Pay sugar price is marked old (like the seed)', () => {
    const now = Date.now()
    const pnp = searchSample({ q: 'sugar', now }).results[0].listings.find((l) => l.storeName === 'Pick n Pay Hatfield')
    expect(now - new Date(pnp.verifiedAt).getTime()).toBeGreaterThan(48 * 60 * 60 * 1000)
  })
})

describe('fetchSearchPage', () => {
  test('an empty search returns nothing without calling the database', async () => {
    mockRpc = jest.fn()
    await expect(fetchSearchPage({ q: '   ' })).resolves.toEqual({ results: [], total: 0 })
    expect(mockRpc).not.toHaveBeenCalled()
  })

  test('maps the database rows into the screen shape', async () => {
    mockRpc = jest.fn().mockResolvedValue({
      error: null,
      data: [
        {
          product_id: 'p1',
          product_name: 'White Sugar 2kg',
          brand_label: 'Huletts',
          volumetric_size: '2kg',
          total_count: 4,
          listings: [
            { listing_id: 'l1', store_id: 's1', store_name: 'Shoprite Hatfield', suburb_name: 'Hatfield', price_zar: '42.99', stock_status: 'In Stock', verified_at: '2026-11-16T10:00:00Z' },
          ],
        },
      ],
    })
    const page = await fetchSearchPage({ q: 'sugar', suburbId: 'abc', offset: 10 })
    expect(mockRpc).toHaveBeenCalledWith('search_products', { q: 'sugar', p_suburb: 'abc', p_limit: 10, p_offset: 10 })
    expect(page.total).toBe(4)
    expect(page.results[0]).toMatchObject({ id: 'p1', name: 'White Sugar 2kg', brand: 'Huletts', size: '2kg' })
    expect(page.results[0].listings[0]).toMatchObject({ listingId: 'l1', storeName: 'Shoprite Hatfield', price: 42.99 })
  })

  test('on the live site, a missing database never falls back to sample prices', async () => {
    mockIsDev = false
    await expect(fetchSearchPage({ q: 'sugar' })).rejects.toThrow('Something went wrong. Try again.')

    mockRpc = jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'not found' } })
    await expect(fetchSearchPage({ q: 'sugar' })).rejects.toMatchObject({ code: 'PGRST202' })
  })

  test('on the live site, an old sample suburb id is ignored instead of showing sample data', async () => {
    mockIsDev = false
    mockRpc = jest.fn().mockResolvedValue({ data: [], error: null })
    await fetchSearchPage({ q: 'sugar', suburbId: 'sample-hatfield' })
    expect(mockRpc).toHaveBeenCalledWith('search_products', expect.objectContaining({ p_suburb: null }))
  })
})
