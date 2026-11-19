// Calls for S6. Plan §7: delete account is POST /api/account/delete; log out goes through
// authStore (#14), so the header and every screen see the user leave straight away.
import { api, ApiError } from '../../lib/api.js'
import { authStore } from '../../lib/authStore.js'
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

/** Without Supabase (development with the sample shopper) there is nobody to log out. */
export async function logOut() {
  if (supabase) await authStore.logOut()
}

/** Marks the account for deletion; a scheduled job removes it within 7 days (plan §7). */
export async function deleteAccount() {
  await api('/account/delete', { method: 'POST' })
  await logOut()
}
