import { fetchBasketPrices, fetchNearbyStores, fetchSuburbs } from '../data.js'
import { sampleStores, sampleSuburbs } from '../sampleData.js'

// Control what data.js reads from lib/supabase.js: development or live, and whether Supabase is set up.
let mockIsDev = true
let mockClient = null
jest.mock('../supabase.js', () => ({
  get isDev() {
    return mockIsDev
  },
  get supabase() {
    return mockClient
  },
}))

// A tiny stand-in for the Supabase query builder: every call chains, and awaiting gives `result`.
function queryReturning(result) {
  const builder = {
    calls: [],
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  }
  for (const method of ['select', 'order', 'eq', 'in']) {
    builder[method] = (...args) => {
      builder.calls.push([method, ...args])
      return builder
    }
  }
  return builder
}

afterEach(() => {
  mockIsDev = true
  mockClient = null
})

describe('development without Supabase uses sample data', () => {
  test('fetchSuburbs returns the sample suburbs', async () => {
    await expect(fetchSuburbs()).resolves.toBe(sampleSuburbs)
  })

  test('fetchNearbyStores returns the sample stores', async () => {
    await expect(fetchNearbyStores(null)).resolves.toEqual(sampleStores)
  })

  test('fetchBasketPrices returns sample prices for sample products', async () => {
    const { products } = await fetchBasketPrices(['sample-sugar'])
    expect(products).toHaveLength(1)
    expect(products.every((p) => p.id.startsWith('sample-'))).toBe(true)
  })
})

describe('live site without Supabase shows an error, never sample data', () => {
  beforeEach(() => {
    mockIsDev = false
  })

  test('fetchSuburbs throws NOT_CONFIGURED', async () => {
    await expect(fetchSuburbs()).rejects.toMatchObject({ code: 'NOT_CONFIGURED' })
  })

  test('fetchNearbyStores throws NOT_CONFIGURED', async () => {
    await expect(fetchNearbyStores(null)).rejects.toMatchObject({ code: 'NOT_CONFIGURED' })
  })

  test('fetchNearbyStores throws even for a sample suburb id', async () => {
    await expect(fetchNearbyStores('sample-hatfield')).rejects.toMatchObject({ code: 'NOT_CONFIGURED' })
  })

  test('fetchBasketPrices throws NOT_CONFIGURED', async () => {
    await expect(fetchBasketPrices(['sample-sugar'])).rejects.toMatchObject({ code: 'NOT_CONFIGURED' })
  })

  test('an empty basket still needs no database', async () => {
    await expect(fetchBasketPrices([])).resolves.toEqual({ products: [], stores: [], listings: [] })
  })
})

describe('live site with Supabase ignores sample ids left in the browser', () => {
  beforeEach(() => {
    mockIsDev = false
  })

  test('a sample suburb id falls back to all stores from the database', async () => {
    const storesQuery = queryReturning({
      data: [{ id: 's1', name: 'Real Store', suburb_id: 'u1', suburbs: { name: 'Hatfield' } }],
      error: null,
    })
    const levelsQuery = queryReturning({ data: [{ store_id: 's1', level: 'low' }], error: null })
    mockClient = { from: jest.fn((table) => (table === 'stores' ? storesQuery : levelsQuery)) }

    const stores = await fetchNearbyStores('sample-hatfield')

    expect(stores).toEqual([
      { id: 's1', name: 'Real Store', suburbId: 'u1', suburbName: 'Hatfield', queueLevel: 'low' },
    ])
    expect(storesQuery.calls.some(([method]) => method === 'eq')).toBe(false)
  })

  test('sample product ids are dropped from the basket query', async () => {
    mockClient = { from: jest.fn() }
    await expect(fetchBasketPrices(['sample-sugar'])).resolves.toEqual({
      products: [],
      stores: [],
      listings: [],
    })
    expect(mockClient.from).not.toHaveBeenCalled()
  })
})
