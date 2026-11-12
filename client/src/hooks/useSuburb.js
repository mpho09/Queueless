import { useCallback, useState } from 'react'

const KEY = 'queueless.suburbId'

function read() {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

/**
 * The shopper's chosen suburb, kept in localStorage so it can be cleared (PRD §12.4).
 * Saving it to profiles.suburb_id for logged-in users comes with F4 (#19).
 */
export function useSuburb() {
  const [suburbId, setSuburbIdState] = useState(read)

  const setSuburbId = useCallback((id) => {
    setSuburbIdState(id || null)
    try {
      if (id) localStorage.setItem(KEY, id)
      else localStorage.removeItem(KEY)
    } catch {
      // Storage blocked (private mode): the choice still works for this visit.
    }
  }, [])

  return [suburbId, setSuburbId]
}
