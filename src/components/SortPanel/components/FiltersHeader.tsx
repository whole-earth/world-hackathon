"use client"

import { HeaderCreditsPill } from '@/components/Header/HeaderCreditsPill'

export function FiltersHeader() {
  return (
    <header className="absolute top-0 left-0 right-0 p-4">
      <div className="relative flex items-center justify-center">
        <h1 className="text-lg font-semibold text-center">Filters</h1>
        <div className="absolute right-0">
          <HeaderCreditsPill />
        </div>
      </div>
    </header>
  )
}

