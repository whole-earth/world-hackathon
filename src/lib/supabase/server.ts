import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SECRET_KEY

  if (!url || !serviceKey) {
    const missing = [] as string[]
    if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL')
    if (!serviceKey) missing.push('SUPABASE_SECRET_KEY')
    throw new Error(`Missing required Supabase env vars for server: ${missing.join(', ')}`)
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

