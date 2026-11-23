// GET /api/suburbs & PATCH /api/me/suburb (#19): Suburb directory and user suburb preference.
import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

const SERVER_ERROR = 'Something went wrong. Try again.'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Formats suburb rows and attaches store counts per suburb.
 * @param {Array<{ id: string, name: string, city: string }>} suburbs
 * @param {Array<{ suburb_id: string }>} stores
 */
export function buildSuburbsList(suburbs, stores = []) {
  const counts = new Map()
  for (const s of stores) {
    counts.set(s.suburb_id, (counts.get(s.suburb_id) ?? 0) + 1)
  }

  return suburbs.map((suburb) => ({
    id: suburb.id,
    name: suburb.name,
    city: suburb.city,
    storeCount: counts.get(suburb.id) ?? 0,
  }))
}

export async function loadSuburbsData(db) {
  const [suburbsRes, storesRes] = await Promise.all([
    db.from('suburbs').select('id, name, city').order('name', { ascending: true }),
    db.from('stores').select('suburb_id'),
  ])

  const failed = [suburbsRes, storesRes].find((r) => r.error)
  if (failed) throw new Error(failed.error.message)

  return buildSuburbsList(suburbsRes.data ?? [], storesRes.data ?? [])
}

export async function saveUserSuburb(db, userId, suburbId) {
  if (suburbId !== null) {
    const { data: suburb, error: findError } = await db
      .from('suburbs')
      .select('id, name, city')
      .eq('id', suburbId)
      .maybeSingle()

    if (findError) throw new Error(findError.message)
    if (!suburb) return null
  }

  const { data: profile, error: updateError } = await db
    .from('profiles')
    .update({ suburb_id: suburbId })
    .eq('id', userId)
    .select('id, suburb_id')
    .maybeSingle()

  if (updateError) throw new Error(updateError.message)
  return profile
}

async function loadFromSupabase() {
  if (!supabase) throw new Error('Supabase is not configured on the server')
  return loadSuburbsData(supabase)
}

async function updateInSupabase(userId, suburbId) {
  if (!supabase) throw new Error('Supabase is not configured on the server')
  return saveUserSuburb(supabase, userId, suburbId)
}

/**
 * @param {{
 *   requireUser: import('express').RequestHandler,
 *   loadSuburbs?: () => Promise<Array<object>>,
 *   updateUserSuburb?: (userId: string, suburbId: string | null) => Promise<object | null>
 * }} deps
 */
export function createSuburbsRouter({
  requireUser,
  loadSuburbs = loadFromSupabase,
  updateUserSuburb = updateInSupabase,
}) {
  const router = Router()

  router.get('/suburbs', async (_req, res) => {
    try {
      const suburbs = await loadSuburbs()
      res.json({ suburbs })
    } catch (error) {
      console.error(`[suburbs] list failed: ${error.message}`)
      res.status(500).json({ error: SERVER_ERROR })
    }
  })

  router.patch('/me/suburb', requireUser, async (req, res) => {
    const { suburbId } = req.body ?? {}

    if (suburbId !== null && (typeof suburbId !== 'string' || !UUID_RE.test(suburbId))) {
      return res.status(400).json({ error: 'suburbId must be a valid UUID or null' })
    }

    try {
      const updated = await updateUserSuburb(req.user.id, suburbId)
      if (!updated) {
        return res.status(404).json({ error: 'Suburb or user profile not found' })
      }
      res.json({ suburbId: updated.suburb_id })
    } catch (error) {
      console.error(`[suburbs] update user ${req.user.id}: ${error.message}`)
      res.status(500).json({ error: SERVER_ERROR })
    }
  })

  return router
}
