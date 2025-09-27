"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { THEMES } from '@/constants/themes'
import { ChevronDown } from 'lucide-react'

type Props = {
  value: string
  onChange: (v: string) => void
}

export function CategorySelect({ value, onChange }: Props) {
  return (
    <div className="mb-3 flex justify-center">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-40 bg-white/5 border-white/15 text-white rounded-[12px] relative [&>svg]:hidden">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-center">
            <span className="inline-flex items-center justify-center">
              <SelectValue placeholder="Select category" />
              <span className="relative ml-1">
                <ChevronDown className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 opacity-70" />
              </span>
            </span>
          </div>
        </SelectTrigger>
        <SelectContent className="bg-neutral-900 text-white border-white/15 rounded-[12px] text-center">
          <SelectItem value="all" className="justify-center">All</SelectItem>
          {Object.entries(THEMES).map(([key, meta]) => (
            <SelectItem key={key} value={key} className="justify-center">{meta.title}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

