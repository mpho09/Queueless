// Data for S2 Search Results (#11): calls the search_products() database function.
// In development only, sample data stands in when Supabase isn't set up or the function
// doesn't exist yet. On the live site the error is shown instead, so fake prices never look real.
import { isDev, supabase } from '../../lib/supabase.js'
import { ApiError } from '../../lib/api.js'
import { messages } from '../../lib/messages.js'
import { sampleListings, sampleProducts, sampleStores, sampleSuburbs } from '../../lib/sampleData.js'

export const PAGE_SIZE = 10

// PostgREST "function not found" and Postgres "does not exist" codes
const MISSING_CODES = new Set(['PGRST202', '42883', '42P01'])

/**
 * One page of search results.
 * @returns {Promise<{ results: Array<{ id, name, brand, size, listings: Array<{ listingId, storeId,
 *   storeName, suburbName, price, stockStatus, verifiedAt }> }>, total: number }>}
 */
export async function fetchSearchPage({ q, suburbId = null, offset = 0 }) {
  const term = (q ?? '').trim()
  if (!term) return { results: [], total: 0 }

  if (!supabase) {
    if (isDev) return searchSample({ q: term, suburbId, offset })
    throw new ApiError(messages.serverError, 0, 'NOT_CONFIGURED')
  }
  if (isSampleId(suburbId)) {
    if (isDev) return searchSample({ q: term, suburbId, offset })
    suburbId = null // a sample suburb left in the browser from development: search everywhere
  }

  const { data, error } = await supabase.rpc('search_products', {
    q: term,
    p_suburb: suburbId,
    p_limit: PAGE_SIZE,
    p_offset: offset,
  })
  if (error) {
    if (isDev && MISSING_CODES.has(error.code)) return searchSample({ q: term, suburbId, offset })
    throw error
  }

  return {
    results: data.map((row) => ({
      id: row.product_id,
      name: row.product_name,
      brand: row.brand_label,
      size: row.volumetric_size,
      listings: (row.listings ?? []).map((l) => ({
        listingId: l.listing_id,
        storeId: l.store_id,
        storeName: l.store_name,
        suburbName: l.suburb_name,
        price: Number(l.price_zar),
        stockStatus: l.stock_status,
        verifiedAt: l.verified_at,
      })),
    })),
    total: data.length > 0 ? Number(data[0].total_count) : offset,
  }
}

function isSampleId(id) {
  return typeof id === 'string' && id.startsWith('sample-')
}

// ── Sample search (development only) ────────────────────────────────────────────────────
// Mirrors search_products(): case-insensitive match on name or brand, cheapest store first,
// products ordered by their cheapest price. Two prices are 3 days old, like the seed data.

const DAY_MS = 24 * 60 * 60 * 1000
const STALE_SAMPLE = new Set(['sample-sugar|sample-pnp-hatfield', 'sample-oil|sample-shoprite-hatfield'])

export function searchSample({ q, suburbId = null, offset = 0, now = Date.now() }) {
  const term = q.trim().toLowerCase()
  if (!term) return { results: [], total: 0 }
  const stores = new Map(sampleStores.map((s) => [s.id, s]))
  const suburbNames = new Map(sampleSuburbs.map((s) => [s.id, s.name]))

  const matches = sampleProducts
    .filter((p) => p.name.toLowerCase().includes(term) || p.brand.toLowerCase().includes(term))
    .map((p) => {
      const listings = sampleListings
        .filter((l) => l.productId === p.id)
        .map((l) => ({ l, store: stores.get(l.storeId) }))
        .filter(({ store }) => !suburbId || store.suburbId === suburbId)
        .map(({ l, store }) => ({
          listingId: `${l.productId}|${l.storeId}`,
          storeId: store.id,
          storeName: store.name,
          suburbName: suburbNames.get(store.suburbId) ?? store.suburbName,
          price: l.price,
          stockStatus: l.stockStatus,
          verifiedAt: new Date(now - (STALE_SAMPLE.has(`${l.productId}|${l.storeId}`) ? 3 * DAY_MS : 0)).toISOString(),
        }))
        .sort((a, b) => a.price - b.price || a.storeName.localeCompare(b.storeName))
      return { ...p, listings }
    })
    .filter((p) => p.listings.length > 0)
    .sort((a, b) => a.listings[0].price - b.listings[0].price || a.name.localeCompare(b.name))

  return { results: matches.slice(offset, offset + PAGE_SIZE), total: matches.length }
}
