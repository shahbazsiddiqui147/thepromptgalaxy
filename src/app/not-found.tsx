import Link from 'next/link'

export default function NotFound() {
  return (
    <main style={{ padding: '10vh 32px', maxWidth: 720 }}>
      <span className="kicker">404</span>
      <h1 style={{ fontSize: 56, letterSpacing: '-0.04em', margin: '8px 0 16px' }}>That page is not here.</h1>
      <p>It may have moved or been removed. Try the home page to browse by category or tool.</p>
      <p>
        <Link href="/" className="btn btn-primary">Back to home</Link>
      </p>
    </main>
  )
}
