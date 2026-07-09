export function SearchForm() {
  return (
    <form action="/search/" style={{ display: 'flex' }}>
      <input
        type="search"
        name="q"
        placeholder="Search prompts…"
        className="mono"
        style={{
          background: 'var(--ink-panel)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          padding: '6px 10px',
          color: 'var(--paper)',
          fontSize: 13,
          width: 160,
        }}
      />
    </form>
  )
}
