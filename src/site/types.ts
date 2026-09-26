export type Card = {
  id: number
  slug: string
  title: string
  categoryName: string
  categorySlug: string
  authorHandle: string | null
  saveCount: number
  isPremium: boolean
  isChain: boolean
  stepCount: number
  exampleMediaId: number | null
  primaryToolName: string | null
}

export type CardFilters = {
  categoryId?: number
  toolId?: number
  styleId?: number
  greatFitOnly?: boolean
  price?: 'free' | 'premium'
  sort?: 'saved' | 'newest'
  limit: number
  offset: number
}

export const promptUrl = (slug: string) => `/prompt/${slug}/`
export const categoryUrl = (slug: string) => `/category/${slug}/`
export const toolUrl = (slug: string) => `/tool/${slug}/`
export const styleUrl = (slug: string) => `/style/${slug}/`

export function compactNumber(n: number): string {
  if (n >= 10000) return `${Math.round(n / 1000)}k`
  if (n >= 1000) return `${(Math.round(n / 100) / 10).toString().replace(/\.0$/, '')}k`
  return String(n)
}
