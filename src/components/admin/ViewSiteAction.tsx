export function ViewSiteAction() {
  return (
    <a
      href="/"
      target="_blank"
      rel="noopener noreferrer"
      style={{
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--theme-text)',
        textDecoration: 'none',
        padding: '6px 12px',
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 4,
        marginRight: 8,
        display: 'inline-block',
      }}
    >
      View Site ↗
    </a>
  )
}
