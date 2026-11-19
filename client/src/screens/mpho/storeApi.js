// Data for S3 Store Details (#12): the store, its queue level (BR4 view store_queue_status) and its prices.
// In development only, sample data stands in when Supabase isn't set up. On the live site the error is
// shown instead, so fake stores and queue levels never look real.
import { isDev, supabase } from '../../lib/supabase.js'
import { ApiError } from '../../lib/api.js'
import { messages } from '../../lib/messages.js'
import { sampleListings, sampleProducts, sampleStores } from '../../lib/sampleData.js'

// "table or view does not exist": the queue view isn't pushed yet, so the queue is Unknown
const MISSING_CODES = new Set(['42P01', 'PGRST205'])
// "invalid input syntax for type uuid": a mistyped link, treated as "store not found"
const BAD_ID_CODE = '22P02'

export const STORE_NOT_FOUND = 'STORE_NOT_FOUND'

function isSampleId(id) {
  return typeof id === 'string' && id.startsWith('sample-')
}

function notFound() {
  return new ApiError('This store could not be found.', 404, STORE_NOT_FOUND)
}

const UNKNOWN_QUEUE = { level: 'unknown', reportCount: 0, lastReportAt: null }

/**
 * Everything S3 shows for one store.
 * @returns {Promise<{
 *   store: { id, name, address, openingHours, suburbName },
 *   queue: { level, reportCount, lastReportAt },
 *   listings: Array<{ listingId, productId, name, brand, size, price, stockStatus, verifiedAt }>
 * }>}
 */
export async function fetchStoreDetails(storeId) {
  if (!supabase || isSampleId(storeId)) {
    if (isDev) return sampleStoreDetails(storeId)
    if (!supabase) throw new ApiError(messages.serverError, 0, 'NOT_CONFIGURED')
    throw notFound() // a sample store link left over from development
  }

  const [storeRes, listingsRes, queueRes] = await Promise.all([
    supabase.from('stores').select('id, name, address, opening_hours, suburbs(name)').eq('id', storeId).maybeSingle(),
    supabase
      .from('listings')
      .select('id, product_id, price_zar, stock_status, verified_at, products(product_name, brand_label, volumetric_size)')
      .eq('store_id', storeId),
    supabase.from('store_queue_status').select('level, report_count, last_report_at').eq('store_id', storeId).maybeSingle(),
  ])

  if (storeRes.error?.code === BAD_ID_CODE) throw notFound()
  const error = storeRes.error ?? listingsRes.error
  if (error) throw error
  if (!storeRes.data) throw notFound()
  if (queueRes.error && !MISSING_CODES.has(queueRes.error.code)) throw queueRes.error

  const s = storeRes.data
  const q = queueRes.data
  return {
    store: {
      id: s.id,
      name: s.name,
      address: s.address,
      openingHours: s.opening_hours,
      suburbName: s.suburbs?.name ?? '',
    },
    queue: q ? { level: q.level, reportCount: q.report_count, lastReportAt: q.last_report_at } : UNKNOWN_QUEUE,
    listings: listingsRes.data
      .map((l) => ({
        listingId: l.id,
        productId: l.product_id,
        name: l.products?.product_name ?? '',
        brand: l.products?.brand_label ?? '',
        size: l.products?.volumetric_size ?? '',
        price: Number(l.price_zar),
        stockStatus: l.stock_status,
        verifiedAt: l.verified_at,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }
}

/** Development only: the same shape built from src/lib/sampleData.js. */
export function sampleStoreDetails(storeId, now = Date.now()) {
  const s = sampleStores.find((store) => store.id === storeId)
  if (!s) throw notFound()
  const products = new Map(sampleProducts.map((p) => [p.id, p]))
  const verifiedAt = new Date(now - 60 * 60 * 1000).toISOString()
  return {
    store: {
      id: s.id,
      name: s.name,
      address: `${s.suburbName}, Pretoria`,
      openingHours: '08:00–20:00',
      suburbName: s.suburbName,
    },
    queue: { level: s.queueLevel, reportCount: 3, lastReportAt: new Date(now - 10 * 60 * 1000).toISOString() },
    listings: sampleListings
      .filter((l) => l.storeId === storeId)
      .map((l) => {
        const p = products.get(l.productId)
        return {
          listingId: `${l.storeId}-${l.productId}`,
          productId: l.productId,
          name: p.name,
          brand: p.brand,
          size: p.size,
          price: l.price,
          stockStatus: l.stockStatus,
          verifiedAt,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name)),
  }
}
