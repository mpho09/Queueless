// Reads for Home (S1) and Basket (S4). Uses Supabase when it's set up, and the sample data
// (src/lib/sampleData.js) when it isn't, or when the tables from #8 don't exist yet.
import { supabase } from './supabase.js'
import { sampleListings, sampleProducts, sampleStores, sampleSuburbs } from './sampleData.js'

// Postgres / PostgREST codes for "table or view does not exist"
const MISSING_TABLE_CODES = new Set(['42P01', 'PGRST205', 'PGRST200'])

function isMissingTable(error) {
  return MISSING_TABLE_CODES.has(error?.code)
}

function isSampleId(id) {
  return typeof id === 'string' && id.startsWith('sample-')
}

export async function fetchSuburbs() {
  if (!supabase) return sampleSuburbs
  const { data, error } = await supabase.from('suburbs').select('id, name, city').order('name')
  if (error) {
    if (isMissingTable(error)) return sampleSuburbs
    throw error
  }
  return data
}

export async function fetchNearbyStores(suburbId) {
  if (!supabase || isSampleId(suburbId)) {
    return sampleStores.filter((s) => !suburbId || s.suburbId === suburbId)
  }

  let query = supabase.from('stores').select('id, name, suburb_id, suburbs(name)').order('name')
  if (suburbId) query = query.eq('suburb_id', suburbId)
  const { data: stores, error } = await query
  if (error) {
    if (isMissingTable(error)) return sampleStores
    throw error
  }

  const levels = await fetchQueueLevels(stores.map((s) => s.id))

  return stores.map((s) => ({
    id: s.id,
    name: s.name,
    suburbId: s.suburb_id,
    suburbName: s.suburbs?.name ?? '',
    queueLevel: levels[s.id] ?? 'unknown',
  }))
}

// BR4 queue level per store; until the view exists (#12) every store shows Unknown.
async function fetchQueueLevels(storeIds) {
  const levels = {}
  if (storeIds.length === 0) return levels
  const { data, error } = await supabase
    .from('store_queue_status')
    .select('store_id, level')
    .in('store_id', storeIds)
  if (error && !isMissingTable(error)) throw error
  for (const row of data ?? []) levels[row.store_id] = row.level
  return levels
}

function sampleBasketPrices(productIds) {
  const ids = new Set(productIds)
  const listings = sampleListings.filter((l) => ids.has(l.productId))
  const storeIds = new Set(listings.map((l) => l.storeId))
  return {
    products: sampleProducts.filter((p) => ids.has(p.id)),
    stores: sampleStores.filter((s) => storeIds.has(s.id)),
    listings,
  }
}

/**
 * Products, prices and stores for the basket comparison (S4, BR3).
 * Returns { products, stores, listings } in the shape utils/basketTotals.js expects.
 */
export async function fetchBasketPrices(productIds) {
  if (productIds.length === 0) return { products: [], stores: [], listings: [] }
  if (!supabase || productIds.some(isSampleId)) return sampleBasketPrices(productIds)

  const [productsRes, listingsRes] = await Promise.all([
    supabase.from('products').select('id, product_name, brand_label, volumetric_size').in('id', productIds),
    supabase
      .from('listings')
      .select('product_id, store_id, price_zar, stock_status, stores(id, name, suburb_id, suburbs(name))')
      .in('product_id', productIds),
  ])
  const error = productsRes.error ?? listingsRes.error
  if (error) {
    if (isMissingTable(error)) return sampleBasketPrices(productIds)
    throw error
  }

  const storesById = new Map()
  for (const l of listingsRes.data) {
    if (l.stores) storesById.set(l.stores.id, l.stores)
  }
  const levels = await fetchQueueLevels([...storesById.keys()])

  return {
    products: productsRes.data.map((p) => ({
      id: p.id,
      name: p.product_name,
      brand: p.brand_label,
      size: p.volumetric_size,
    })),
    stores: [...storesById.values()].map((s) => ({
      id: s.id,
      name: s.name,
      suburbId: s.suburb_id,
      suburbName: s.suburbs?.name ?? '',
      queueLevel: levels[s.id] ?? 'unknown',
    })),
    listings: listingsRes.data.map((l) => ({
      productId: l.product_id,
      storeId: l.store_id,
      price: Number(l.price_zar),
      stockStatus: l.stock_status,
    })),
  }
}
