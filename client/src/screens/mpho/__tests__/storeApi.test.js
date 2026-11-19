import { fetchStoreDetails, sampleStoreDetails, STORE_NOT_FOUND } from '../storeApi.js'

// Control what storeApi reads from lib/supabase.js: development or live, and whether Supabase is set up.
let mockIsDev = true
let mockClient = null
jest.mock('../../../lib/supabase.js', () => ({
  get isDev() {
    return mockIsDev
  },
  get supabase() {
    return mockClient
  },
}))

afterEach(() => {
  mockIsDev = true
  mockClient = null
})

// A stand-in for the Supabase query builder: every call chains; awaiting or maybeSingle() gives the result.
function queryReturning(result) {
  const builder = {
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    maybeSingle: () => Promise.resolve(result),
  }
  for (const method of ['select', 'eq']) builder[method] = () => builder
  return builder
}

function clientWith({ store, listings = { data: [], error: null }, queue }) {
  return {
    from: jest.fn((table) =>
      queryReturning({ stores: store, listings, store_queue_status: queue }[table]),
    ),
  }
}

const STORE_ROW = {
  id: 's1',
  name: 'Shoprite Hatfield',
  address: 'Hatfield, Pretoria',
  opening_hours: '08:00–20:00',
  suburbs: { name: 'Hatfield' },
}

describe('development', () => {
  test('without Supabase, a sample store comes from the sample data', async () => {
    const { store, queue, listings } = await fetchStoreDetails('sample-checkers-hatfield')
    expect(store.name).toBe('Checkers Hatfield')
    expect(queue.level).toBe('moderate')
    expect(listings.map((l) => l.name)).toEqual(['Albany Superior White Bread 700g', 'Clover Full Cream Milk 2L'])
  })

  test('an unknown sample store is "not found"', () => {
    expect(() => sampleStoreDetails('sample-nowhere')).toThrow(expect.objectContaining({ code: STORE_NOT_FOUND }))
  })
})

describe('live site', () => {
  beforeEach(() => {
    mockIsDev = false
  })

  test('without Supabase it throws NOT_CONFIGURED, never sample data', async () => {
    await expect(fetchStoreDetails('sample-shoprite-hatfield')).rejects.toMatchObject({ code: 'NOT_CONFIGURED' })
  })

  test('maps the store, the BR4 queue view and the listings', async () => {
    mockClient = clientWith({
      store: { data: STORE_ROW, error: null },
      queue: { data: { level: 'long', report_count: 6, last_report_at: '2026-11-19T12:05:00Z' }, error: null },
      listings: {
        data: [
          {
            id: 'l2', product_id: 'p2', price_zar: '42.99', stock_status: 'In Stock', verified_at: '2026-11-19T10:00:00Z',
            products: { product_name: 'White Sugar 2kg', brand_label: 'Huletts', volumetric_size: '2kg' },
          },
          {
            id: 'l1', product_id: 'p1', price_zar: '36.99', stock_status: 'Limited Stock', verified_at: '2026-11-19T09:00:00Z',
            products: { product_name: 'Clover Full Cream Milk 2L', brand_label: 'Clover', volumetric_size: '2L' },
          },
        ],
        error: null,
      },
    })

    const details = await fetchStoreDetails('s1')

    expect(details.store).toEqual({
      id: 's1', name: 'Shoprite Hatfield', address: 'Hatfield, Pretoria', openingHours: '08:00–20:00', suburbName: 'Hatfield',
    })
    expect(details.queue).toEqual({ level: 'long', reportCount: 6, lastReportAt: '2026-11-19T12:05:00Z' })
    expect(details.listings[0]).toEqual({
      listingId: 'l1', productId: 'p1', name: 'Clover Full Cream Milk 2L', brand: 'Clover', size: '2L',
      price: 36.99, stockStatus: 'Limited Stock', verifiedAt: '2026-11-19T09:00:00Z',
    })
    expect(details.listings.map((l) => l.listingId)).toEqual(['l1', 'l2'])
  })

  test('if the queue view is not pushed yet, the queue is Unknown', async () => {
    mockClient = clientWith({
      store: { data: STORE_ROW, error: null },
      queue: { data: null, error: { code: 'PGRST205' } },
    })
    await expect(fetchStoreDetails('s1')).resolves.toMatchObject({
      queue: { level: 'unknown', reportCount: 0, lastReportAt: null },
    })
  })

  test('a store that does not exist is "not found"', async () => {
    mockClient = clientWith({ store: { data: null, error: null }, queue: { data: null, error: null } })
    await expect(fetchStoreDetails('s404')).rejects.toMatchObject({ code: STORE_NOT_FOUND })
  })

  test('a mistyped store id is "not found", not a server error', async () => {
    mockClient = clientWith({ store: { data: null, error: { code: '22P02' } }, queue: { data: null, error: null } })
    await expect(fetchStoreDetails('not-a-uuid')).rejects.toMatchObject({ code: STORE_NOT_FOUND })
  })

  test('a sample store id left over from development is "not found"', async () => {
    mockClient = clientWith({ store: { data: null, error: null }, queue: { data: null, error: null } })
    await expect(fetchStoreDetails('sample-shoprite-hatfield')).rejects.toMatchObject({ code: STORE_NOT_FOUND })
    expect(mockClient.from).not.toHaveBeenCalled()
  })

  test('other database errors are thrown', async () => {
    mockClient = clientWith({ store: { data: null, error: { code: '500', message: 'boom' } }, queue: { data: null, error: null } })
    await expect(fetchStoreDetails('s1')).rejects.toMatchObject({ code: '500' })
  })
})
