// Calls for S5 Report Submission. Everything goes through the Supabase browser client, so
// Row Level Security and the report_logs triggers (BR2, D4) stay in charge (migration report_triggers).
import { ApiError } from '../../lib/api.js'
import { messages } from '../../lib/messages.js'
import { supabase } from '../../lib/supabase.js'

function requireClient() {
  if (!supabase) throw new ApiError(messages.serverError, 0, 'NOT_CONFIGURED')
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new ApiError(messages.offline, 0, 'OFFLINE')
  }
  return supabase
}

/** The store's name and coordinates (coordinates are only used for the 50 km check). */
export async function fetchStore(storeId) {
  const { data, error } = await requireClient()
    .from('stores')
    .select('id, name, latitude, longitude')
    .eq('id', storeId)
    .maybeSingle()
  if (error) throw new ApiError(messages.serverError, 500, error.code)
  if (!data) throw new ApiError(messages.serverError, 404, 'NOT_FOUND')
  return data
}

/** All stores, for the Stores list. */
export async function fetchStores() {
  const { data, error } = await requireClient()
    .from('stores')
    .select('id, name, address, opening_hours')
    .order('name')
  if (error) throw new ApiError(messages.serverError, 500, error.code)
  return data ?? []
}

/** Products sold at this store, for the Price and Stock tabs. */
export async function fetchListings(storeId) {
  const { data, error } = await requireClient()
    .from('listings')
    .select('id, price_zar, stock_status, products(product_name, brand_label, volumetric_size)')
    .eq('store_id', storeId)
  if (error) throw new ApiError(messages.serverError, 500, error.code)
  return (data ?? [])
    .map((row) => ({
      id: row.id,
      name: row.products?.product_name ?? '',
      size: row.products?.volumetric_size ?? '',
      priceZar: row.price_zar,
      stockStatus: row.stock_status,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** The shopper's position, or null if the browser can't give it or they say no (then there is no check). */
export function getShopperLocation() {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => resolve(null),
      { timeout: 8000, maximumAge: 60000 },
    )
  })
}

/**
 * Turns a database error into an ApiError with the exact message to show.
 * BR2_LIMIT → queue or price message · 42501 (RLS) → forbidden · 22023 → invalid price.
 */
export function toReportError(error, reportType) {
  if (error instanceof ApiError) return error
  if (error?.code === 'P0001' && `${error.message} ${error.details ?? ''}`.includes('BR2_LIMIT')) {
    // Stock reports share the price limit of 3 per hour (plan §6, BR2).
    return reportType === 'Queue'
      ? new ApiError(messages.queueLimit, 429, 'QUEUE_LIMIT')
      : new ApiError(messages.priceLimit, 429, 'PRICE_LIMIT')
  }
  if (error?.code === '42501') return new ApiError(messages.forbidden, 403, 'FORBIDDEN')
  if (error?.code === '22023' && reportType === 'Price') return new ApiError(messages.invalidPrice, 400, 'INVALID_PRICE')
  return new ApiError(messages.serverError, 500, error?.code)
}

/**
 * Saves one report for the logged-in user. `value` is a queue level, a price like '34.99',
 * or a stock status. `locationMismatch` reports are saved but never verified.
 */
export async function submitReport({ storeId, reportType, value, listingId = null, locationMismatch = false }) {
  const client = requireClient()
  const { data } = await client.auth.getUser()
  const userId = data?.user?.id
  // Not logged in: the database would refuse the insert anyway (RLS); say so right away.
  if (!userId) throw new ApiError(messages.forbidden, 403, 'FORBIDDEN')

  const { error } = await client.from('report_logs').insert({
    user_id: userId,
    store_id: storeId,
    listing_id: listingId,
    report_type: reportType,
    submitted_value: value,
    location_mismatch: locationMismatch,
  })
  if (error) throw toReportError(error, reportType)
}
