export function SearchForm({
  defaultValue = '',
  wide = false,
}: {
  defaultValue?: string
  wide?: boolean
}) {
  return (
    <form action="/search/" className="header-search" style={wide ? { width: 260, borderWidth: 2, borderColor: 'var(--color-text)' } : undefined} role="search">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input type="search" name="q" placeholder="Search prompts" defaultValue={defaultValue} aria-label="Search prompts" />
    </form>
  )
}
