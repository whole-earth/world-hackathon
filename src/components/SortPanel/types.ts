import type { ThemeKey } from '@/constants/themes'

export type DemoCard = {
  id: string
  title: string
  subtitle?: string
  image: string
  description?: string
  category: ThemeKey
}

