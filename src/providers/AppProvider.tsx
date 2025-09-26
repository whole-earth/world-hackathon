'use client'

import React, { ReactNode } from 'react'
import type { AppContextType } from '@/types/providers'
import { SupabaseProvider, useSupabase as useSupabaseInternal } from './SupabaseProvider'
import { MinikitProvider, useWorldcoin as useWorldcoinInternal } from './MinikitProvider'
import { WorldAuthProvider } from './WorldAuthProvider'
import { ToastProvider } from './ToastProvider'
import { CreditsProvider } from './CreditsProvider'

// Split providers are composed here and guarded by an error boundary

// Error boundary component
interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

class ProviderErrorBoundary extends React.Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Provider Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <h2 className="text-lg font-semibold text-red-800">Provider Error</h2>
          <p className="text-red-600">
            {this.state.error?.message || 'An error occurred in the provider setup'}
          </p>
        </div>
      )
    }

    return this.props.children
  }
}

// Main AppProvider component
interface AppProviderProps {
  children: ReactNode
}

export function AppProvider({ children }: AppProviderProps) {
  return (
    <ProviderErrorBoundary>
      <SupabaseProvider>
        <MinikitProvider>
          <WorldAuthProvider>
            <CreditsProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </CreditsProvider>
          </WorldAuthProvider>
        </MinikitProvider>
      </SupabaseProvider>
    </ProviderErrorBoundary>
  )
}

export function useSupabaseAdmin() {
  throw new Error(
    'useSupabaseAdmin() is server-only. Import getSupabaseAdmin() from src/lib/supabase/server in server components, routes, or actions.'
  )
}

// Re-export hooks and provide a unified convenience hook
export function useSupabase() { return useSupabaseInternal() }
export function useWorldcoin() { return useWorldcoinInternal() }

export function useApp(): AppContextType {
  const supabase = useSupabaseInternal()
  const { minikit, isReady, isInstalled } = useWorldcoinInternal()
  return {
    supabase,
    minikit,
    isWorldcoinReady: isReady,
    isWorldcoinInstalled: isInstalled,
  }
}

export function useProviders(): AppContextType { return useApp() }
