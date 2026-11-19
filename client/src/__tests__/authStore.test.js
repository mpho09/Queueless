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
    ...overrides,
  }
  return { auth, authEvent: (event, session) => onChange(event, session) }
}

const options = { getOrigin: () => 'https://queueless.test' }
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

afterEach(() => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true })
})

describe('session state', () => {
  test('starts loading, then settles on a guest when nobody is logged in', async () => {
    const store = createAuthStore(fakeClient(), options)
    expect(store.getSnapshot()).toEqual({ user: null, loading: true })
    store.subscribe(() => {})
    await flush()
    expect(store.getSnapshot()).toEqual({ user: null, loading: false })
  })

  test('picks up a session that already exists (page refresh)', async () => {
    const user = { id: 'u1', email: 'joy@example.com' }
    const { auth } = fakeClient({ getSession: jest.fn().mockResolvedValue({ data: { session: { user } } }) })
    const store = createAuthStore({ auth }, options)
    store.subscribe(() => {})
    await flush()
    expect(store.getSnapshot()).toEqual({ user, loading: false })
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
    expect(store.getSnapshot()).toEqual({ user: null, loading: false })
  })

  test('if reading the session fails, loading still ends', async () => {
    const { auth } = fakeClient({ getSession: jest.fn().mockRejectedValue(new Error('offline')) })
    const store = createAuthStore({ auth }, options)
    store.subscribe(() => {})
    await flush()
    expect(store.getSnapshot()).toEqual({ user: null, loading: false })
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

  test('too many tries → the locked-account text', async () => {
    const client = fakeClient({
      signInWithPassword: jest.fn().mockResolvedValue({ data: {}, error: { code: 'over_request_rate_limit', status: 429 } }),
    })
    await expect(createAuthStore(client, options).logIn('joy@example.com', 'x')).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      message: messages.accountLocked,
    })
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
    for (const action of [() => store.logIn('a@b.co', 'x'), () => store.signUp('a@b.co', 'x'), () => store.logOut(), () => store.resetPassword('a@b.co')]) {
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
