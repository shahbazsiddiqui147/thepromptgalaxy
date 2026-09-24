import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPool } from '@/db/pool'
import { requireUser } from '@/lib/current-user'
import { getToolLink } from '@/matrix/repo'
import { saveCombo } from '../../../actions'

export default async function ComboPage({
  params,
  searchParams,
}: {
  params: Promise<{ categoryId: string; toolId: string }>
  searchParams: Promise<{ error?: string }>
}) {
  await requireUser(['admin', 'editor'])
  const { categoryId: categoryText, toolId: toolText } = await params
  const categoryId = Number(categoryText)
  const toolId = Number(toolText)
  if (!Number.isInteger(categoryId) || !Number.isInteger(toolId)) notFound()
  const link = await getToolLink(getPool(), categoryId, toolId)
  if (!link) notFound()
  const { error } = await searchParams

  return (
    <>
      <div className="admin-head">
        <h1>
          {link.categoryName} × {link.toolName}
        </h1>
        <Link className="btn btn-secondary" href="/admin/matrix/">
          Back to matrix
        </Link>
      </div>
      {error ? <div className="banner banner-error">{error}</div> : null}
      <p className="matrix-legend">
        {link.publishedCount} published prompt(s) currently use this combination ({link.usageCount} in total).
      </p>
      <form action={saveCombo} className="form-grid">
        <input type="hidden" name="categoryId" value={categoryId} />
        <input type="hidden" name="toolId" value={toolId} />
        <div className="field">
          <label htmlFor="sortOrder">Order within the category</label>
          <input id="sortOrder" name="sortOrder" type="number" className="input" defaultValue={link.sortOrder} />
        </div>
        <label className="check">
          <input name="isFeatured" type="checkbox" defaultChecked={link.isFeatured} />
          Featured (show this tool first on the category page)
        </label>
        <label className="check">
          <input name="isIndexable" type="checkbox" defaultChecked={link.isIndexable} />
          Indexable combination page (own title and intro for search engines)
        </label>
        <div className="field">
          <label htmlFor="seoTitle">SEO title</label>
          <input id="seoTitle" name="seoTitle" type="text" className="input" defaultValue={link.seoTitle} />
        </div>
        <div className="field">
          <label htmlFor="seoDescription">SEO description</label>
          <textarea id="seoDescription" name="seoDescription" className="input" rows={3} defaultValue={link.seoDescription} />
        </div>
        <div className="field">
          <label htmlFor="intro">Intro text</label>
          <textarea id="intro" name="intro" className="input" rows={5} defaultValue={link.intro} />
        </div>
        <div className="actions">
          <button className="btn btn-primary" type="submit">
            Save combination
          </button>
        </div>
      </form>
    </>
  )
}
