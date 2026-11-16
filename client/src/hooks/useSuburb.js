import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const KEY = 'queueless.suburbId'

function read() {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

function isUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

/**
 * The shopper's chosen suburb, kept in localStorage so it can be cleared (PRD §12.4)
 * and synced to profiles.suburb_id for logged-in users (F4 #19).
 */
export function useSuburb() {
  const [suburbId, setSuburbIdState] = useState(read)

  useEffect(() => {
    if (!supabase) return
    let active = true
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data?.user
      if (!active || !user || read()) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('suburb_id')
        .eq('id', user.id)
        .maybeSingle()
      if (active && profile?.suburb_id) {
        setSuburbIdState(profile.suburb_id)
        try { localStorage.setItem(KEY, profile.suburb_id) } catch {}
      }
    }).catch(() => {})
    return () => { active = false }
  }, [])

  const setSuburbId = useCallback((id) => {
    setSuburbIdState(id || null)
    try {
      if (id) localStorage.setItem(KEY, id)
      else localStorage.removeItem(KEY)
    } catch {}

    if (supabase) {
      supabase.auth.getUser().then(({ data }) => {
        const user = data?.user
        if (!user) return
        const dbSuburbId = isUuid(id) ? id : null
        supabase.from('profiles').update({ suburb_id: dbSuburbId }).eq('id', user.id).then(() => {})
      }).catch(() => {})
    }
  }, [])

  return [suburbId, setSuburbId]
}
