// The logged-in user, shared by every component (#14). Wraps Supabase Auth.
// Use it through the `useAuth()` hook (src/hooks/useAuth.js), not directly.
//
// `createAuthStore(client)` takes the Supabase client as an argument so tests can pass a fake.
import { messages } from './messages.js'
import { supabase } from './supabase.js'

/** Thrown by sign-up, log-in, log-out and reset. `message` is ready to show; `code` is for logic. */
export class AuthError extends Error {
  /** @param {string} message @param {'INVALID_CREDENTIALS'|'EMAIL_NOT_CONFIRMED'|'WEAK_PASSWORD'|'SAME_PASSWORD'|'EMAIL_TAKEN'|'REAUTH_NEEDED'|'RATE_LIMITED'|'OFFLINE'|'NETWORK'|'NOT_CONFIGURED'|'UNKNOWN'} code */
  constructor(message, code) {
    super(message)
    this.name = 'AuthError'
    this.code = code
  }
}

/** Supabase error → AuthError, using the exact texts from messages.js. */
export function toAuthError(error) {
  const code = error?.code
  if (code === 'invalid_credentials') return new AuthError(messages.loginFailed, 'INVALID_CREDENTIALS')
  if (code === 'email_not_confirmed') return new AuthError(messages.emailNotVerified, 'EMAIL_NOT_CONFIRMED')
  if (code === 'weak_password') return new AuthError(messages.passwordRules, 'WEAK_PASSWORD')
  if (code === 'same_password') return new AuthError(messages.samePassword, 'SAME_PASSWORD')
  if (code === 'user_already_exists' || code === 'email_exists') return new AuthError(messages.emailTaken, 'EMAIL_TAKEN')
  if (code === 'reauthentication_needed') return new AuthError(messages.reauthNeeded, 'REAUTH_NEEDED')
  // Supabase's rate limit is not our "5 wrong tries = 15 minutes" rule (that needs the server-side
  // lockout, plan D11), so every 429 gets the general text. messages.accountLocked is kept for D11.
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit' || error?.status === 429) {
    return new AuthError(messages.tooManyTries, 'RATE_LIMITED')
  }
  if (error?.name === 'AuthRetryableFetchError') return new AuthError(messages.serverError, 'NETWORK')
  return new AuthError(messages.serverError, 'UNKNOWN')
}

const clean = (email) => String(email ?? '').trim().toLowerCase() // PRD: emails are stored lowercase

// Remembers, for this browser tab only, that the person arrived from a password-reset email, so a
// refresh of /reset-password still shows the form. Any logged-in session WITHOUT this flag is not
// allowed to set a new password there (someone holding an unlocked phone must not lock the owner out).
const RECOVERY_KEY = 'queueless-password-recovery'
const recoveryFlag = {
  read() {
    try {
      return globalThis.sessionStorage?.getItem(RECOVERY_KEY) === '1'
    } catch {
      return false
    }
  },
  write(on) {
    try {
      if (on) globalThis.sessionStorage?.setItem(RECOVERY_KEY, '1')
      else globalThis.sessionStorage?.removeItem(RECOVERY_KEY)
    } catch {
      // Storage blocked (private mode): the flag just won't survive a refresh.
    }
  },
}

/** True when Supabase could not be reached at all, as opposed to rejecting the request. */
const isNetworkError = (error) => error.name === 'AuthRetryableFetchError' || error.status === 0 || error.status >= 500

export function createAuthStore(client, { getOrigin = () => window.location.origin } = {}) {
  // `loading` is true until Supabase has told us whether someone is logged in.
  let state = { user: null, loading: Boolean(client), passwordRecovery: Boolean(client) && recoveryFlag.read() }
  const listeners = new Set()
  let started = false

  function setState(next) {
    if ('passwordRecovery' in next) recoveryFlag.write(next.passwordRecovery)
    state = { ...state, ...next }
    listeners.forEach((listener) => listener())
  }

  // Supabase tells us about log-in, log-out, token refresh and password-recovery links.
  function start() {
    if (started || !client) return
    started = true
    // Only set state in this callback; calling Supabase again from inside it can deadlock.
    client.auth.onAuthStateChange((event, session) => {
      const next = { user: session?.user ?? null, loading: false }
      if (event === 'PASSWORD_RECOVERY') next.passwordRecovery = true
      if (event === 'SIGNED_OUT') next.passwordRecovery = false
      setState(next)
    })
    client.auth
      .getSession()
      .then(({ data }) => setState({ user: data?.session?.user ?? null, loading: false }))
      .catch(() => setState({ loading: false }))
  }

  function guard() {
    if (!client) throw new AuthError(messages.serverError, 'NOT_CONFIGURED')
    if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new AuthError(messages.offline, 'OFFLINE')
  }

  /**
   * Forgets the session on this device without any network call. supabase-js's own
   * `signOut({ scope: 'local' })` still calls the server first and keeps the session if that fails,
   * so it can't be used offline. `_removeSession` clears every key Supabase stores (session, user,
   * PKCE verifiers) and fires SIGNED_OUT; the fallback removes the keys directly.
   */
  async function forgetSessionOnThisDevice() {
    const auth = client.auth
    if (typeof auth._removeSession === 'function') {
      await auth._removeSession()
    } else if (auth.storageKey && auth.storage?.removeItem) {
      await auth.storage.removeItem(auth.storageKey)
      await auth.storage.removeItem(`${auth.storageKey}-user`)
      await auth.storage.removeItem(`${auth.storageKey}-code-verifier`)
    }
    setState({ user: null, passwordRecovery: false })
  }

  return {
    /** Starts listening to Supabase. Called right away for the app's store so no early event is missed. */
    start,

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
      if (error) throw toAuthError(error)
      return { needsVerification: !data?.session }
    },

    /** Sends the verification email again (A4 "Resend email"). */
    async resendVerification(email) {
      guard()
      const { error } = await client.auth.resend({
        type: 'signup',
        email: clean(email),
        options: { emailRedirectTo: `${getOrigin()}/login` },
      })
      if (error) throw toAuthError(error)
    },

    /** Resolves the user, or throws an AuthError (wrong details, unverified email, too many tries…). */
    async logIn(email, password) {
      guard()
      const { data, error } = await client.auth.signInWithPassword({ email: clean(email), password })
      if (error) throw toAuthError(error)
      return data.user
    },

    /**
     * Always works, even with no signal: when offline, or when Supabase can't be reached, it forgets
     * the session on this device without the network, so someone on a shared phone can still log out.
     */
    async logOut() {
      if (!client) throw new AuthError(messages.serverError, 'NOT_CONFIGURED')
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return forgetSessionOnThisDevice()

      const { error } = await client.auth.signOut()
      if (error && isNetworkError(error)) return forgetSessionOnThisDevice()
      if (error) throw toAuthError(error)
      setState({ user: null, passwordRecovery: false })
    },

    /** Sends the reset link (valid for 1 hour, set in Supabase). Same result whether or not the email exists. */
    async resetPassword(email) {
      guard()
      const { error } = await client.auth.resetPasswordForEmail(clean(email), { redirectTo: `${getOrigin()}/reset-password` })
      if (error) throw toAuthError(error)
    },

    /**
     * Saves a new password. Only for someone who opened a reset link (`passwordRecovery`): a session
     * that just happens to be logged in must not be able to change the password without the old one.
     */
    async updatePassword(password) {
      guard()
      if (!state.passwordRecovery) throw new AuthError(messages.reauthNeeded, 'REAUTH_NEEDED')
      const { error } = await client.auth.updateUser({ password })
      if (error) throw toAuthError(error)
      setState({ passwordRecovery: false })
    },
  }
}

export const authStore = createAuthStore(supabase)
// Listen from the moment the app loads: Supabase fires PASSWORD_RECOVERY once (in a setTimeout) right
// after it reads the reset link, which can be before any component has subscribed. A microtask runs
// before that timeout, and after every module has finished loading.
queueMicrotask(() => authStore.start())
