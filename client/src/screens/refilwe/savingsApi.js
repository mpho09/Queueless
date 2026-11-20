// Calls for S6. Plan §7: delete account is POST /api/account/delete; log out goes through
// authStore (#14), so the header and every screen see the user leave straight away.
import { api, ApiError } from '../../lib/api.js'
import { AuthError, authStore, toAuthError } from '../../lib/authStore.js'
import { messages } from '../../lib/messages.js'
import { isDev, supabase } from '../../lib/supabase.js'
import { sampleSavings } from './sampleSavings.js'
import { savingsText } from './savingsText.js'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * S6 "Change email" (PRD §5, plan §7). Supabase emails a confirmation link to the current address
 * AND the new one ("Secure email change"); the login email changes only once both are confirmed,
 * and migration profile_email_sync then updates profiles.email. Throws an AuthError whose
 * message is ready to show. `client` is replaceable for tests.
 */
export async function changeEmail(newEmail, currentEmail, client = supabase) {
  const email = String(newEmail ?? '').trim().toLowerCase()
  if (!EMAIL.test(email)) throw new AuthError(savingsText.changeEmailInvalid, 'INVALID_EMAIL')
  if (email === String(currentEmail ?? '').toLowerCase()) throw new AuthError(savingsText.changeEmailSame, 'SAME_EMAIL')
  if (!client) throw new AuthError(messages.serverError, 'NOT_CONFIGURED')
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new AuthError(messages.offline, 'OFFLINE')

  const { error } = await client.auth.updateUser(
    { email },
    { emailRedirectTo: `${window.location.origin}/savings` }, // the links bring them back to S6
  )
  if (error) throw toAuthError(error)
}

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
