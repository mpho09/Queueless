// Calls for S6. Plan §7: delete account is POST /api/account/delete; log out is supabase signOut().
import { api, ApiError } from '../../lib/api.js'
import { supabase } from '../../lib/supabase.js'
import { sampleSavings } from './sampleSavings.js'

/**
 * GET /api/me/savings. Until Supabase is set up, or while the route isn't built yet (404),
 * the screen shows the sample shopper so it can be built and checked against the designs.
 */
export async function fetchSavings() {
  if (!supabase) return sampleSavings
  try {
    return await api('/me/savings')
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return sampleSavings
    throw error
  }
}

export async function logOut() {
  if (supabase) {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }
}

/** Marks the account for deletion; a scheduled job removes it within 7 days (plan §7). */
export async function deleteAccount() {
  await api('/account/delete', { method: 'POST' })
  await logOut()
}
