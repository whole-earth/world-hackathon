import type { ThemeKey } from '@/constants/themes'

export type DemoCard = {
  id: string
  title: string
  subtitle?: string
  color: string
  description?: string
  category: ThemeKey
}

