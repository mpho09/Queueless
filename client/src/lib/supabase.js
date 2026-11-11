import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.warn('[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set.')
}

// Browser client: uses the public anon key. Access is controlled by Row Level Security.
export const supabase = url && anonKey ? createClient(url, anonKey) : null
