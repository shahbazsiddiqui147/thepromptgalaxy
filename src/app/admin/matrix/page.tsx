import Link from 'next/link'
import { getPool } from '@/db/pool'
import { requireUser } from '@/lib/current-user'
import { getStyleMatrix, getToolMatrix } from '@/matrix/repo'
import { toggleStyleLink, toggleToolLink } from './actions'

async function ToolGrid() {
  const { categories, tools, links } = await getToolMatrix(getPool())
  const byPair = new Map(links.map((link) => [`${link.categoryId}:${link.toolId}`, link]))
  if (categories.length === 0 || tools.length === 0) {
    return <p>Create at least one category and one tool first.</p>
  }
  return (
    <table className="table matrix">
      <thead>
        <tr>
          <th>Category</th>
          {tools.map((tool) => (
            <th key={tool.id}>
              {tool.name}
              {tool.isActive ? null : ' (hidden)'}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {categories.map((category) => (
          <tr key={category.id}>
            <td>
              {category.name}
              {category.isActive ? null : ' (hidden)'}
            </td>
            {tools.map((tool) => {
              const link = byPair.get(`${category.id}:${tool.id}`)
              return (
                <td key={tool.id} className={link ? 'cell-on' : 'cell-off'}>
                  <div className="actions" style={{ justifyContent: 'center' }}>
                    <form action={toggleToolLink} className="inline-form">
                      <input type="hidden" name="categoryId" value={category.id} />
                      <input type="hidden" name="toolId" value={tool.id} />
                      <input type="hidden" name="enabled" value={link ? 'false' : 'true'} />
                      <button className="btn btn-secondary" type="submit" title={link ? 'Unlink' : 'Link'}>
                        {link ? link.publishedCount : '+'}
                      </button>
                    </form>
                    {link ? (
                      <Link href={`/admin/matrix/combo/${category.id}/${tool.id}/`} title="Combination settings">
                        edit
                      </Link>
                    ) : null}
                  </div>
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

async function StyleGrid() {
  const { categories, styles, links } = await getStyleMatrix(getPool())
  const byPair = new Map(links.map((link) => [`${link.categoryId}:${link.styleId}`, link]))
  if (categories.length === 0 || styles.length === 0) {
    return <p>Create at least one category and one style first.</p>
  }
  return (
    <table className="table matrix">
      <thead>
        <tr>
          <th>Category</th>
          {styles.map((style) => (
            <th key={style.id}>
              {style.name}
              {style.isActive ? null : ' (hidden)'}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {categories.map((category) => (
          <tr key={category.id}>
            <td>
              {category.name}
              {category.supportsStyles ? null : ' (no styles)'}
            </td>
            {styles.map((style) => {
              const link = byPair.get(`${category.id}:${style.id}`)
              return (
                <td key={style.id} className={link ? 'cell-on' : 'cell-off'}>
                  {category.supportsStyles ? (
                    <form action={toggleStyleLink} className="inline-form">
                      <input type="hidden" name="categoryId" value={category.id} />
                      <input type="hidden" name="styleId" value={style.id} />
                      <input type="hidden" name="enabled" value={link ? 'false' : 'true'} />
                      <button className="btn btn-secondary" type="submit" title={link ? 'Unlink' : 'Link'}>
                        {link ? link.publishedCount : '+'}
                      </button>
                    </form>
                  ) : (
                    '–'
                  )}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default async function MatrixPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; error?: string }>
}) {
  await requireUser(['admin', 'editor'])
  const { tab, error } = await searchParams
  const stylesTab = tab === 'styles'

  return (
    <>
      <div className="admin-head">
        <h1>Relations matrix</h1>
      </div>
      <nav className="tabs">
        <Link href="/admin/matrix/" aria-current={stylesTab ? undefined : 'page'}>
          Categories × tools
        </Link>
        <Link href="/admin/matrix/?tab=styles" aria-current={stylesTab ? 'page' : undefined}>
          Categories × styles
        </Link>
      </nav>
      {error ? <div className="banner banner-error">{error}</div> : null}
      <p className="matrix-legend">
        Click a cell to link or unlink. The number is how many <strong>published</strong> prompts use that pair; it is
        counted live, never typed. A pair used by prompts cannot be unlinked.
      </p>
      {stylesTab ? await StyleGrid() : await ToolGrid()}
    </>
  )
}
