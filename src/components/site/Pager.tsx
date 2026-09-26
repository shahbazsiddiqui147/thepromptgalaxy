import Link from 'next/link'

/** Numbered pagination. `basePath` already contains the other query parameters, e.g. "/category/x/?tool=y". */
export function Pager({ basePath, page, pages }: { basePath: string; page: number; pages: number }) {
  if (pages <= 1) return null
  const href = (n: number) => {
    const join = basePath.includes('?') ? '&' : '?'
    return n === 1 ? basePath : `${basePath}${join}page=${n}`
  }
  const numbers = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 2)
  return (
    <nav className="pager" aria-label="Pagination">
      {page > 1 ? <Link href={href(page - 1)} rel="prev">← Previous</Link> : null}
      {numbers.map((n, i) => (
        <span key={n} style={{ border: 0, padding: 0 }}>
          {i > 0 && n - numbers[i - 1] > 1 ? '… ' : ''}
          {n === page ? <span className="on" aria-current="page">{n}</span> : <Link href={href(n)}>{n}</Link>}
        </span>
      ))}
      {page < pages ? <Link href={href(page + 1)} rel="next">Next →</Link> : null}
    </nav>
  )
}
