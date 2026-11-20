import { useSyncExternalStore } from 'react'
import { authStore } from '../lib/authStore.js'

/**
 * The current user and the account actions (#14).
 *
 *   const { user, loading, isLoggedIn, logIn, logOut, signUp, resendVerification, resetPassword, updatePassword } = useAuth()
 *
 * - `loading` is true until we know whether someone is logged in. Wait for it before
 *   redirecting a guest, or logged-in users will flash the log-in screen on refresh.
 * - `user` is the Supabase user (`user.id`, `user.email`), or null for a guest.
 * - `passwordRecovery` is true only after the person opened a password-reset email link.
 * - The actions throw an `AuthError` (see lib/authStore.js) whose `message` is ready to show
 *   and whose `code` you can switch on, e.g. 'EMAIL_NOT_CONFIRMED' → go to /verify-email.
 * - API calls add the log-in token by themselves (lib/api.js), so you don't pass it around.
 */
export function useAuth() {
  const { user, loading, passwordRecovery } = useSyncExternalStore(authStore.subscribe, authStore.getSnapshot, authStore.getSnapshot)
  return {
    user,
    loading,
    passwordRecovery,
    isLoggedIn: Boolean(user),
    signUp: authStore.signUp,
    logIn: authStore.logIn,
    logOut: authStore.logOut,
    resendVerification: authStore.resendVerification,
    resetPassword: authStore.resetPassword,
    updatePassword: authStore.updatePassword,
  }
}
