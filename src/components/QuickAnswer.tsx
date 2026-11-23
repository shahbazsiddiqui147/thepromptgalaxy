export function QuickAnswer({ text }: { text: string }) {
  return (
    <div
      style={{
        background: '#1E2138',
        border: '1px solid #C9A22755',
        borderLeft: '3px solid var(--color-accent)',
        borderRadius: 4,
        padding: '14px 16px',
        marginBottom: 24,
      }}
    >
      <div className="mono" style={{ fontSize: 10, color: 'var(--color-accent)', letterSpacing: '0.15em', marginBottom: 6 }}>
        QUICK ANSWER
      </div>
      <p style={{ color: 'var(--color-text)', fontSize: 14, lineHeight: 1.55, margin: 0 }}>{text}</p>
    </div>
  )
}
