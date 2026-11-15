// Fetch wrapper for our own Express API (/api/*).
// Adds the logged-in user's access token and turns failures into ApiError.
import { supabase } from './supabase.js'
import { messages } from './messages.js'

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export async function api(path, { method = 'GET', body, headers = {} } = {}) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new ApiError(messages.offline, 0, 'OFFLINE')
  }

  const finalHeaders = { Accept: 'application/json', ...headers }
  if (body !== undefined) finalHeaders['Content-Type'] = 'application/json'

  if (supabase) {
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    if (token) finalHeaders.Authorization = `Bearer ${token}`
  }

  let res
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: finalHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(messages.serverError, 0, 'NETWORK')
  }

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) throw new ApiError(messages.sessionExpired, 401, 'UNAUTHORIZED')
    if (res.status === 403) throw new ApiError(messages.forbidden, 403, 'FORBIDDEN')
    throw new ApiError(data?.error || messages.serverError, res.status, data?.code)
  }
  return data
}
