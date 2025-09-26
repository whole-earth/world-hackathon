'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { SupabaseContextType } from '@/types'

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined)

function validateEnvironment() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabasePublishableKey) {
    const missing = [] as string[]
    if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
    if (!supabasePublishableKey) missing.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
    throw new Error(`Missing required Supabase environment variables: ${missing.join(', ')}`)
  }

  return { supabaseUrl, supabasePublishableKey }
}

function createBrowserSupabase(): SupabaseClient {
  const { supabaseUrl, supabasePublishableKey } = validateEnvironment()
  return createClient(supabaseUrl, supabasePublishableKey)
}

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<SupabaseClient | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const c = createBrowserSupabase()
      setClient(c)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize Supabase')
    }
  }, [])

  if (error) {
    // Let an upper error boundary render a friendly message
    throw new Error(error)
  }

  const value = useMemo(() => ({ supabase: client }), [client])

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  )
}

export function useSupabase(): SupabaseClient | null {
  const ctx = useContext(SupabaseContext)
  if (ctx === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider')
  }
  return ctx.supabase
}
