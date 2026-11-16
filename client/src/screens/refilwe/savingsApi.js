// Calls for S6. Plan §7: delete account is POST /api/account/delete; log out is supabase signOut().
import { api, ApiError } from '../../lib/api.js'
import { messages } from '../../lib/messages.js'
import { isDev, supabase } from '../../lib/supabase.js'
import { sampleSavings } from './sampleSavings.js'

/**
 * GET /api/me/savings. In development only, the sample shopper stands in until Supabase is set up
 * or while the route isn't built yet (404). On the live site it never does, so made-up savings
 * can't look like real data: the screen shows its error state instead.
 */
export async function fetchSavings() {
  if (!supabase) {
    if (isDev) return sampleSavings
    throw new ApiError(messages.serverError, 0, 'NOT_CONFIGURED')
  }
  try {
    return await api('/me/savings')
  } catch (error) {
    if (isDev && error instanceof ApiError && error.status === 404) return sampleSavings
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
