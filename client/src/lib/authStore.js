// The logged-in user, shared by every component (#14). Wraps Supabase Auth.
// Use it through the `useAuth()` hook (src/hooks/useAuth.js), not directly.
//
// `createAuthStore(client)` takes the Supabase client as an argument so tests can pass a fake.
import { messages } from './messages.js'
import { supabase } from './supabase.js'

/** Thrown by sign-up, log-in, log-out and reset. `message` is ready to show; `code` is for logic. */
export class AuthError extends Error {
  /** @param {string} message @param {'INVALID_CREDENTIALS'|'EMAIL_NOT_CONFIRMED'|'WEAK_PASSWORD'|'RATE_LIMITED'|'OFFLINE'|'NETWORK'|'NOT_CONFIGURED'|'UNKNOWN'} code */
  constructor(message, code) {
    super(message)
    this.name = 'AuthError'
    this.code = code
  }
}

/** Supabase error → AuthError, using the exact texts from messages.js. */
export function toAuthError(error, { action } = {}) {
  const code = error?.code
  if (code === 'invalid_credentials') return new AuthError(messages.loginFailed, 'INVALID_CREDENTIALS')
  if (code === 'email_not_confirmed') return new AuthError(messages.emailNotVerified, 'EMAIL_NOT_CONFIRMED')
  if (code === 'weak_password') return new AuthError(messages.passwordRules, 'WEAK_PASSWORD')
  if (code === 'over_request_rate_limit' || error?.status === 429) {
    return new AuthError(action === 'logIn' ? messages.accountLocked : messages.serverError, 'RATE_LIMITED')
  }
  if (error?.name === 'AuthRetryableFetchError') return new AuthError(messages.serverError, 'NETWORK')
  return new AuthError(messages.serverError, 'UNKNOWN')
}

const clean = (email) => String(email ?? '').trim().toLowerCase() // PRD: emails are stored lowercase

export function createAuthStore(client, { getOrigin = () => window.location.origin } = {}) {
  // `loading` is true until Supabase has told us whether someone is logged in.
  let state = { user: null, loading: Boolean(client) }
  const listeners = new Set()
  let started = false

  function setState(next) {
    state = { ...state, ...next }
    listeners.forEach((listener) => listener())
  }

  // Starts on the first subscriber. Supabase tells us about log-in, log-out and token refresh.
  function start() {
    if (started || !client) return
    started = true
    // Only set state in this callback; calling Supabase again from inside it can deadlock.
    client.auth.onAuthStateChange((_event, session) => setState({ user: session?.user ?? null, loading: false }))
    client.auth
      .getSession()
      .then(({ data }) => setState({ user: data?.session?.user ?? null, loading: false }))
      .catch(() => setState({ loading: false }))
  }

  function guard() {
    if (!client) throw new AuthError(messages.serverError, 'NOT_CONFIGURED')
    if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new AuthError(messages.offline, 'OFFLINE')
  }

  return {
    subscribe(listener) {
      listeners.add(listener)
      start()
      return () => listeners.delete(listener)
    },
    getSnapshot: () => state,

    /**
     * Creates the account and sends the verification email. Resolves { needsVerification }.
     * The two checkboxes go to the database as user metadata; the profiles_trigger migration
     * creates the profile from them and rejects the sign-up if either one is not ticked.
     * @param {{ displayName?: string, is16OrOlder: boolean, privacyConsent: boolean }} details
     */
    async signUp(email, password, { displayName, is16OrOlder, privacyConsent } = {}) {
      guard()
      const { data, error } = await client.auth.signUp({
        email: clean(email),
        password,
        options: {
          emailRedirectTo: `${getOrigin()}/login`,
          data: {
            display_name: String(displayName ?? '').trim(),
            is_16_or_older: is16OrOlder === true,
            privacy_consent: privacyConsent === true,
          },
        },
      })
      if (error) throw toAuthError(error, { action: 'signUp' })
      return { needsVerification: !data?.session }
    },

    /** Resolves the user, or throws an AuthError (wrong details, unverified email, too many tries…). */
    async logIn(email, password) {
      guard()
      const { data, error } = await client.auth.signInWithPassword({ email: clean(email), password })
      if (error) throw toAuthError(error, { action: 'logIn' })
      return data.user
    },

    async logOut() {
      guard()
      const { error } = await client.auth.signOut()
      if (error) throw toAuthError(error, { action: 'logOut' })
      setState({ user: null })
    },

    /** Sends the reset link (valid for 1 hour, set in Supabase). Same result whether or not the email exists. */
    async resetPassword(email) {
      guard()
      const { error } = await client.auth.resetPasswordForEmail(clean(email), { redirectTo: `${getOrigin()}/reset-password` })
      if (error) throw toAuthError(error, { action: 'resetPassword' })
    },
  }
}

export const authStore = createAuthStore(supabase)
