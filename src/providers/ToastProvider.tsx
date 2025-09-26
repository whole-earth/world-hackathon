"use client"

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

type Toast = { id: number; kind: 'success' | 'error' | 'info'; text: string }

type ToastContextValue = {
  toast: (kind: Toast['kind'], text: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback<ToastContextValue['toast']>((kind, text) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, kind, text }])
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
    }, 3000)
  }, [])

  const value = useMemo<ToastContextValue>(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="absolute bottom-24 right-4 z-[70] space-y-2">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`rounded-md px-3 py-2 text-sm shadow border ${t.kind === 'success' ? 'bg-green-600 text-white border-green-500' : t.kind === 'error' ? 'bg-red-600 text-white border-red-500' : 'bg-white text-black border-black/10'}`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
