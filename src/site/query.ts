export type SearchParams = Record<string, string | string[] | undefined>

export type HubQuery = {
  tool?: string
  category?: string
  style?: string
  fit: boolean
  price?: 'free' | 'premium'
  sort: 'saved' | 'newest'
  page: number
}

const first = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v)
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function parseHubQuery(sp: SearchParams): HubQuery {
  const slug = (key: string) => {
    const value = first(sp[key])
    return value && SLUG.test(value) ? value : undefined
  }
  const price = first(sp.price)
  const page = Number(first(sp.page))
  return {
    tool: slug('tool'),
    category: slug('category'),
    style: slug('style'),
    fit: first(sp.fit) === 'great',
    price: price === 'free' || price === 'premium' ? price : undefined,
    sort: first(sp.sort) === 'newest' ? 'newest' : 'saved',
    page: Number.isInteger(page) && page >= 1 ? Math.min(page, 500) : 1,
  }
}

/** Builds "/path/?a=1&b=2" from the given params; undefined, null, false and empty values are left out. */
export function buildHref(path: string, params: Record<string, string | number | boolean | null | undefined>): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === false || value === '') continue
    query.set(key, value === true ? 'great' : String(value))
  }
  const text = query.toString()
  return text ? `${path}?${text}` : path
}
