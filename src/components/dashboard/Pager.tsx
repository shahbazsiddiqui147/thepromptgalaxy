import { pageHref } from '@/lib/dashboard/http'

/**
 * Server component on purpose. Pagination links are built here from a path and
 * search params so list pages never pass a function into a Client Component.
 */
export function Pager({
  page,
  totalPages,
  totalDocs,
  pathname,
  params = {},
}: {
  page: number
  totalPages: number
  totalDocs: number
  pathname: string
  params?: Record<string, string | undefined>
}) {
  if (totalDocs === 0) return null
  const prev = pageHref(pathname, params, page - 1)
  const next = pageHref(pathname, params, page + 1)
  return (
    <nav className="dash-pager" aria-label="Pagination">
      <span>
        Page {page} of {Math.max(totalPages, 1)} · {totalDocs} total
      </span>
      <div>
        {page > 1 ? (
          <a className="btn btn-secondary" href={prev}>
            Previous
          </a>
        ) : (
          <span className="btn btn-secondary" aria-disabled="true">
            Previous
          </span>
        )}
        {page < totalPages ? (
          <a className="btn btn-secondary" href={next}>
            Next
          </a>
        ) : (
          <span className="btn btn-secondary" aria-disabled="true">
            Next
          </span>
        )}
      </div>
    </nav>
  )
}
