export function catalogHref(
  path: string,
  params: { tool?: string | null; subject?: string | null; style?: string | null; sort?: 'saved' | 'new' | null },
): string {
  const search = new URLSearchParams()
  if (params.tool) search.set('tool', params.tool)
  if (params.subject) search.set('subject', params.subject)
  if (params.style) search.set('style', params.style)
  if (params.sort === 'new') search.set('sort', 'new')
  const query = search.toString()
  return query ? `${path}?${query}` : path
}
