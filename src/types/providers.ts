import { SupabaseClient } from '@supabase/supabase-js'
import { MiniKit } from '@worldcoin/minikit-js'

export interface AppContextType {
  // Supabase
  supabase: SupabaseClient | null
  
  // Worldcoin
  minikit: typeof MiniKit
  isWorldcoinReady: boolean
  isWorldcoinInstalled: boolean
}

// Split contexts for individual providers
export interface SupabaseContextType {
  supabase: SupabaseClient | null
}

export interface MinikitContextType {
  minikit: typeof MiniKit
  isWorldcoinReady: boolean
  isWorldcoinInstalled: boolean
}

export interface WorldcoinHookReturn {
  minikit: typeof MiniKit
  isReady: boolean
  isInstalled: boolean
}
