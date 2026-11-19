import { fetchSavings } from '../savingsApi.js'
import { sampleSavings } from '../sampleSavings.js'

// Control the two values savingsApi reads from lib/supabase.js: whether we're in development,
// and whether a Supabase client exists (a fake one that only answers getSession).
let mockIsDev = true
let mockConfigured = false
jest.mock('../../../lib/supabase.js', () => ({
  get isDev() {
    return mockIsDev
  },
  get supabase() {
    return mockConfigured ? { auth: { getSession: async () => ({ data: { session: null } }) } } : null
  },
}))

// authStore reads lib/supabase.js as soon as it loads; these tests don't need it.
jest.mock('../../../lib/authStore.js', () => ({ authStore: { logOut: async () => {} } }))

function respondWith(status, body = {}) {
  global.fetch = jest.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body })
}

afterEach(() => {
  mockIsDev = true
  mockConfigured = false
  delete global.fetch
})

describe('in development', () => {
  test('uses the sample shopper when Supabase is not set up', async () => {
    await expect(fetchSavings()).resolves.toBe(sampleSavings)
  })

  test('uses the sample shopper while /api/me/savings is not built yet (404)', async () => {
    mockConfigured = true
    respondWith(404)
    await expect(fetchSavings()).resolves.toBe(sampleSavings)
  })
})

describe('on the live site (production)', () => {
  beforeEach(() => {
    mockIsDev = false
  })

  test('never shows the sample shopper when Supabase is not set up', async () => {
    await expect(fetchSavings()).rejects.toThrow('Something went wrong. Try again.')
  })

  test('never shows the sample shopper when the API is missing (404)', async () => {
    mockConfigured = true
    respondWith(404)
    await expect(fetchSavings()).rejects.toMatchObject({ status: 404 })
  })

  test('returns the real data when the API answers', async () => {
    mockConfigured = true
    const real = { ...sampleSavings, monthTotalCents: 999 }
    respondWith(200, real)
    await expect(fetchSavings()).resolves.toEqual(real)
  })
})
