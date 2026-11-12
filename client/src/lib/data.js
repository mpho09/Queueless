// Reads for the Home screen. Uses Supabase when it's set up, and the sample data
// (src/lib/sampleData.js) when it isn't, or when the tables from #8 don't exist yet.
import { supabase } from './supabase.js'
import { sampleStores, sampleSuburbs } from './sampleData.js'

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

  // BR4 queue level per store; until the view exists (#17) every store shows Unknown.
  const levels = {}
  if (stores.length > 0) {
    const { data: queue, error: queueError } = await supabase
      .from('store_queue_status')
      .select('store_id, level')
      .in('store_id', stores.map((s) => s.id))
    if (queueError && !isMissingTable(queueError)) throw queueError
    for (const row of queue ?? []) levels[row.store_id] = row.level
  }

  return stores.map((s) => ({
    id: s.id,
    name: s.name,
    suburbId: s.suburb_id,
    suburbName: s.suburbs?.name ?? '',
    queueLevel: levels[s.id] ?? 'unknown',
  }))
}
