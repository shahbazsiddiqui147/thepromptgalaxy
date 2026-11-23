import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="page-pad" style={{ paddingTop: 64, paddingBottom: 80, maxWidth: 720 }}>
      <span className="kicker">404</span>
      <h1 style={{ fontSize: 48, letterSpacing: '-0.03em', margin: '12px 0 16px' }}>That page is not in the library.</h1>
      <p style={{ color: 'var(--color-neutral-700)' }}>The address does not match a category, tool, or prompt.</p>
      <Link href="/" className="btn btn-primary" style={{ marginTop: 8 }}>
        Back home
      </Link>
    </div>
  )
}
