import { AuthError, createAuthStore, toAuthError } from '../lib/authStore.js'
import { messages } from '../lib/messages.js'

/** A fake Supabase client. `authEvent(event, session)` plays a Supabase auth event. */
function fakeClient(overrides = {}) {
  let onChange = () => {}
  const auth = {
    getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
    onAuthStateChange: jest.fn((cb) => {
      onChange = cb
      return { data: { subscription: { unsubscribe: jest.fn() } } }
    }),
    signUp: jest.fn().mockResolvedValue({ data: { session: null, user: { id: 'u1' } }, error: null }),
    signInWithPassword: jest.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'joy@example.com' } }, error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    resetPasswordForEmail: jest.fn().mockResolvedValue({ error: null }),
    resend: jest.fn().mockResolvedValue({ error: null }),
    updateUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
    ...overrides,
  }
  return { auth, authEvent: (event, session) => onChange(event, session) }
}

const options = { getOrigin: () => 'https://queueless.test' }
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

afterEach(() => {
  sessionStorage.clear() // the password-recovery flag lives here
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true })
})

describe('session state', () => {
  test('starts loading, then settles on a guest when nobody is logged in', async () => {
    const store = createAuthStore(fakeClient(), options)
    expect(store.getSnapshot()).toEqual({ user: null, loading: true, passwordRecovery: false })
    store.subscribe(() => {})
    await flush()
    expect(store.getSnapshot()).toEqual({ user: null, loading: false, passwordRecovery: false })
  })

  test('picks up a session that already exists (page refresh)', async () => {
    const user = { id: 'u1', email: 'joy@example.com' }
    const { auth } = fakeClient({ getSession: jest.fn().mockResolvedValue({ data: { session: { user } } }) })
    const store = createAuthStore({ auth }, options)
    store.subscribe(() => {})
    await flush()
    expect(store.getSnapshot()).toEqual({ user, loading: false, passwordRecovery: false })
  })

  test('follows log-in and log-out events, and tells subscribers', async () => {
    const client = fakeClient()
    const store = createAuthStore(client, options)
    const listener = jest.fn()
    store.subscribe(listener)
    await flush()
    listener.mockClear()

    const user = { id: 'u1', email: 'joy@example.com' }
    client.authEvent('SIGNED_IN', { user })
    expect(store.getSnapshot().user).toEqual(user)
    client.authEvent('SIGNED_OUT', null)
    expect(store.getSnapshot().user).toBeNull()
    expect(listener).toHaveBeenCalledTimes(2)
  })

  test('the snapshot object stays the same until something changes (needed by React)', () => {
    const store = createAuthStore(fakeClient(), options)
    expect(store.getSnapshot()).toBe(store.getSnapshot())
  })

  test('an unsubscribed listener is not called again', async () => {
    const client = fakeClient()
    const store = createAuthStore(client, options)
    const listener = jest.fn()
    const unsubscribe = store.subscribe(listener)
    await flush()
    unsubscribe()
    listener.mockClear()
    client.authEvent('SIGNED_IN', { user: { id: 'u1' } })
    expect(listener).not.toHaveBeenCalled()
  })

  test('with no Supabase client (no .env), it is a guest and not loading', () => {
    const store = createAuthStore(null, options)
    store.subscribe(() => {})
    expect(store.getSnapshot()).toEqual({ user: null, loading: false, passwordRecovery: false })
  })

  test('if reading the session fails, loading still ends', async () => {
    const { auth } = fakeClient({ getSession: jest.fn().mockRejectedValue(new Error('offline')) })
    const store = createAuthStore({ auth }, options)
    store.subscribe(() => {})
    await flush()
    expect(store.getSnapshot()).toEqual({ user: null, loading: false, passwordRecovery: false })
  })
})

describe('logIn', () => {
  test('lowercases and trims the email, and returns the user', async () => {
    const client = fakeClient()
    const user = await createAuthStore(client, options).logIn('  Joy@Example.COM ', 'Secret1')
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'joy@example.com', password: 'Secret1' })
    expect(user).toEqual({ id: 'u1', email: 'joy@example.com' })
  })

  test('wrong details → "Incorrect email or password."', async () => {
    const client = fakeClient({
      signInWithPassword: jest.fn().mockResolvedValue({ data: {}, error: { code: 'invalid_credentials', status: 400 } }),
    })
    await expect(createAuthStore(client, options).logIn('joy@example.com', 'nope')).rejects.toMatchObject({
      name: 'AuthError',
      code: 'INVALID_CREDENTIALS',
      message: messages.loginFailed,
    })
  })

  test('unverified email → its own code, so the screen can open /verify-email', async () => {
    const client = fakeClient({
      signInWithPassword: jest.fn().mockResolvedValue({ data: {}, error: { code: 'email_not_confirmed', status: 400 } }),
    })
    await expect(createAuthStore(client, options).logIn('joy@example.com', 'Secret1')).rejects.toMatchObject({
      code: 'EMAIL_NOT_CONFIRMED',
      message: messages.emailNotVerified,
    })
  })

  test('any 429 → the general "too many attempts" text, never the 5-attempts lockout text', async () => {
    for (const error of [{ code: 'over_request_rate_limit', status: 429 }, { status: 429 }, { code: 'over_email_send_rate_limit', status: 429 }]) {
      const client = fakeClient({ signInWithPassword: jest.fn().mockResolvedValue({ data: {}, error }) })
      const thrown = await createAuthStore(client, options).logIn('joy@example.com', 'x').catch((e) => e)
      expect(thrown).toMatchObject({ code: 'RATE_LIMITED', message: messages.tooManyTries })
      expect(thrown.message).not.toBe(messages.accountLocked)
    }
  })
})

describe('signUp', () => {
  test('sends the lowercased email, the profile details and a redirect back to /login', async () => {
    const client = fakeClient()
    const result = await createAuthStore(client, options).signUp('New@Example.com', 'Secret1', {
      displayName: '  Thabo ',
      is16OrOlder: true,
      privacyConsent: true,
    })
    expect(client.auth.signUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'Secret1',
      options: {
        emailRedirectTo: 'https://queueless.test/login',
        data: { display_name: 'Thabo', is_16_or_older: true, privacy_consent: true },
      },
    })
    expect(result).toEqual({ needsVerification: true })
  })

  test('missing checkboxes are sent as false, so the database rejects the sign-up instead of skipping the profile', async () => {
    const client = fakeClient()
    await createAuthStore(client, options).signUp('a@b.co', 'Secret1')
    expect(client.auth.signUp.mock.calls[0][0].options.data).toEqual({
      display_name: '',
      is_16_or_older: false,
      privacy_consent: false,
    })
  })

  test('if Supabase logs the user straight in, no verification is needed', async () => {
    const client = fakeClient({ signUp: jest.fn().mockResolvedValue({ data: { session: { user: {} } }, error: null }) })
    expect(await createAuthStore(client, options).signUp('a@b.co', 'Secret1')).toEqual({ needsVerification: false })
  })

  test('a weak password → the password rules text', async () => {
    const client = fakeClient({ signUp: jest.fn().mockResolvedValue({ data: {}, error: { code: 'weak_password', status: 422 } }) })
    await expect(createAuthStore(client, options).signUp('a@b.co', 'abc')).rejects.toMatchObject({
      code: 'WEAK_PASSWORD',
      message: messages.passwordRules,
    })
  })
})

describe('logOut and resetPassword', () => {
  test('logOut signs out and clears the user right away', async () => {
    const client = fakeClient()
    const store = createAuthStore(client, options)
    store.subscribe(() => {})
    await flush()
    client.authEvent('SIGNED_IN', { user: { id: 'u1' } })
    await store.logOut()
    expect(client.auth.signOut).toHaveBeenCalled()
    expect(store.getSnapshot().user).toBeNull()
  })

  test('offline, logOut forgets the session on this device without calling the server', async () => {
    // supabase-js's signOut({ scope: 'local' }) still calls the server and keeps the session if
    // that fails, so offline we must not call signOut at all.
    const client = fakeClient({ _removeSession: jest.fn().mockResolvedValue(undefined) })
    const store = createAuthStore(client, options)
    store.subscribe(() => {})
    await flush()
    client.authEvent('SIGNED_IN', { user: { id: 'u1' } })
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false })
    await store.logOut()
    expect(client.auth.signOut).not.toHaveBeenCalled()
    expect(client.auth._removeSession).toHaveBeenCalledTimes(1)
    expect(store.getSnapshot().user).toBeNull()
  })

  test('offline, without _removeSession, logOut removes the stored session keys itself', async () => {
    const storage = { removeItem: jest.fn().mockResolvedValue(undefined) }
    const client = fakeClient({ storageKey: 'sb-test-auth-token', storage })
    const store = createAuthStore(client, options)
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false })
    await store.logOut()
    expect(client.auth.signOut).not.toHaveBeenCalled()
    expect(storage.removeItem).toHaveBeenCalledWith('sb-test-auth-token')
    expect(storage.removeItem).toHaveBeenCalledWith('sb-test-auth-token-user')
    expect(store.getSnapshot().user).toBeNull()
  })

  test('online, logOut uses the normal sign-out', async () => {
    const client = fakeClient()
    await createAuthStore(client, options).logOut()
    expect(client.auth.signOut).toHaveBeenCalledTimes(1)
    expect(client.auth.signOut.mock.calls[0][0]).toBeUndefined()
  })

  test('if Supabase cannot be reached, logOut forgets the session on this device', async () => {
    const signOut = jest.fn().mockResolvedValue({ error: { name: 'AuthRetryableFetchError', status: 0 } })
    const _removeSession = jest.fn().mockResolvedValue(undefined)
    const store = createAuthStore(fakeClient({ signOut, _removeSession }), options)
    await store.logOut()
    expect(signOut).toHaveBeenCalledTimes(1)
    expect(_removeSession).toHaveBeenCalledTimes(1)
    expect(store.getSnapshot().user).toBeNull()
  })

  test('a real sign-out error is still thrown', async () => {
    const client = fakeClient({ signOut: jest.fn().mockResolvedValue({ error: { status: 400, code: 'bad_jwt' } }) })
    await expect(createAuthStore(client, options).logOut()).rejects.toMatchObject({ message: messages.serverError })
  })

  test('resendVerification asks Supabase to send the sign-up email again', async () => {
    const client = fakeClient()
    await createAuthStore(client, options).resendVerification(' Joy@Example.com ')
    expect(client.auth.resend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'joy@example.com',
      options: { emailRedirectTo: 'https://queueless.test/login' },
    })
  })

  test('resending too often → the general too-many-attempts text', async () => {
    const client = fakeClient({ resend: jest.fn().mockResolvedValue({ error: { code: 'over_email_send_rate_limit', status: 429 } }) })
    await expect(createAuthStore(client, options).resendVerification('a@b.co')).rejects.toMatchObject({ message: messages.tooManyTries })
  })

  /** A store whose user has just opened a password-reset link. */
  async function recoveringStore(client) {
    const store = createAuthStore(client, options)
    store.subscribe(() => {})
    await flush()
    client.authEvent('PASSWORD_RECOVERY', { user: { id: 'u1' } })
    return store
  }

  test('updatePassword saves the new password after a reset link; a weak one gives the password rules text', async () => {
    const client = fakeClient()
    const store = await recoveringStore(client)
    expect(store.getSnapshot().passwordRecovery).toBe(true)
    await store.updatePassword('NewSecret1')
    expect(client.auth.updateUser).toHaveBeenCalledWith({ password: 'NewSecret1' })
    expect(store.getSnapshot().passwordRecovery).toBe(false) // a reset link changes the password once

    const weak = fakeClient({ updateUser: jest.fn().mockResolvedValue({ data: {}, error: { code: 'weak_password', status: 422 } }) })
    await expect((await recoveringStore(weak)).updatePassword('abc')).rejects.toMatchObject({
      code: 'WEAK_PASSWORD',
      message: messages.passwordRules,
    })
  })

  test('a logged-in session that did not come from a reset link cannot change the password', async () => {
    const client = fakeClient()
    const store = createAuthStore(client, options)
    store.subscribe(() => {})
    await flush()
    client.authEvent('SIGNED_IN', { user: { id: 'u1' } })
    expect(store.getSnapshot().passwordRecovery).toBe(false)
    await expect(store.updatePassword('NewSecret1')).rejects.toMatchObject({ code: 'REAUTH_NEEDED' })
    expect(client.auth.updateUser).not.toHaveBeenCalled()
  })

  test('signing out ends password recovery', async () => {
    const client = fakeClient()
    const store = await recoveringStore(client)
    client.authEvent('SIGNED_OUT', null)
    expect(store.getSnapshot().passwordRecovery).toBe(false)
  })

  test('common Supabase errors get their own message, not the server error', () => {
    expect(toAuthError({ code: 'same_password', status: 422 })).toMatchObject({ code: 'SAME_PASSWORD', message: messages.samePassword })
    expect(toAuthError({ code: 'email_exists', status: 422 })).toMatchObject({ code: 'EMAIL_TAKEN', message: messages.emailTaken })
    expect(toAuthError({ code: 'user_already_exists', status: 422 })).toMatchObject({ code: 'EMAIL_TAKEN' })
    expect(toAuthError({ code: 'reauthentication_needed', status: 401 })).toMatchObject({ code: 'REAUTH_NEEDED', message: messages.reauthNeeded })
  })

  test('resetPassword sends the link to /reset-password', async () => {
    const client = fakeClient()
    await createAuthStore(client, options).resetPassword(' Joy@Example.com ')
    expect(client.auth.resetPasswordForEmail).toHaveBeenCalledWith('joy@example.com', {
      redirectTo: 'https://queueless.test/reset-password',
    })
  })

  test('a failed reset throws a ready-to-show error', async () => {
    const client = fakeClient({ resetPasswordForEmail: jest.fn().mockResolvedValue({ error: { status: 500 } }) })
    await expect(createAuthStore(client, options).resetPassword('a@b.co')).rejects.toMatchObject({ message: messages.serverError })
  })
})

describe('guards', () => {
  test('offline: nothing is sent, and the offline text is thrown', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false })
    const client = fakeClient()
    await expect(createAuthStore(client, options).logIn('a@b.co', 'x')).rejects.toMatchObject({ code: 'OFFLINE', message: messages.offline })
    expect(client.auth.signInWithPassword).not.toHaveBeenCalled()
  })

  test('with no Supabase client, actions fail clearly instead of crashing', async () => {
    const store = createAuthStore(null, options)
    const actions = [
      () => store.logIn('a@b.co', 'x'),
      () => store.signUp('a@b.co', 'x'),
      () => store.logOut(),
      () => store.resetPassword('a@b.co'),
      () => store.resendVerification('a@b.co'),
      () => store.updatePassword('x'),
    ]
    for (const action of actions) {
      await expect(action()).rejects.toMatchObject({ code: 'NOT_CONFIGURED' })
    }
  })
})

describe('toAuthError', () => {
  test('an outage is NETWORK, anything unknown is UNKNOWN; both say "Something went wrong."', () => {
    expect(toAuthError({ name: 'AuthRetryableFetchError' })).toMatchObject({ code: 'NETWORK', message: messages.serverError })
    expect(toAuthError({ code: 'something_new' })).toMatchObject({ code: 'UNKNOWN', message: messages.serverError })
    expect(toAuthError(undefined)).toBeInstanceOf(AuthError)
  })
})
