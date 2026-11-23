import Link from 'next/link'
import { deleteTaxonomy, saveTaxonomy, type TaxonomyKind } from '@/lib/dashboard/actions/records'
import { clientUploadsEnabled, dashboardContext, findOrNotFound, formatWhen, one, readPage } from '@/lib/dashboard/http'
import { ImagePicker } from '@/components/dashboard/ImagePicker'
import { Pager } from '@/components/dashboard/Pager'
import { StringList } from '@/components/dashboard/fields'
import { ActionForm, ConfirmForm, SavedNote, SubmitButton } from '@/components/dashboard/ui'
import type { UploadedMedia } from '@/components/dashboard/uploadMedia'
import type { ArtStyle, ContentType, Media, Subject, Tool } from '@/payload-types'

const META: Record<TaxonomyKind, { title: string; singular: string; hint: string }> = {
  subjects: { title: 'Subjects', singular: 'Subject', hint: 'Name, description, color, order, and icon.' },
  'art-styles': { title: 'Art styles', singular: 'Art style', hint: 'Name, color, order, and the helps/hurts word lists.' },
  tools: { title: 'Tools', singular: 'Tool', hint: 'Name, vendor, capabilities, and whether the tool is still active.' },
  'content-types': { title: 'Content types', singular: 'Content type', hint: 'Name, order, and whether prompts of this type use steps.' },
}

function iconOf(value: number | Media | null | undefined): UploadedMedia | null {
  if (!value || typeof value !== 'object') return null
  return {
    id: value.id,
    alt: value.alt,
    filename: value.filename ?? null,
    url: value.url ?? null,
    thumb: value.sizes?.thumbnail?.url || value.url || null,
  }
}

export async function TaxonomyList({
  kind,
  searchParams,
}: {
  kind: TaxonomyKind
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const meta = META[kind]
  const params = await searchParams
  const q = one(params.q).trim()
  const page = readPage(params.page)
  const { payload, user } = await dashboardContext()
  const result = await payload.find({
    collection: kind,
    where: q ? { name: { contains: q } } : undefined,
    page,
    limit: 40,
    depth: 0,
    sort: 'sortOrder',
    user,
    overrideAccess: false,
  })
  const href = `/dashboard/${kind}/`

  return (
    <>
      <header className="dash-pagehead">
        <div>
          <p className="dash-kicker">Taxonomy</p>
          <h1>{meta.title}</h1>
          <p className="dash-lead">{meta.hint} Slugs are generated from the name on save.</p>
        </div>
        <Link className="btn btn-primary" href={`${href}new/`}>
          New {meta.singular.toLowerCase()}
        </Link>
      </header>
      <SavedNote deleted={one(params.deleted)} />
      <form className="dash-filters" method="get" action={href}>
        <input id="dash-search" className="input" name="q" defaultValue={q} placeholder="Search names" aria-label="Search names" />
        <button className="btn btn-secondary" type="submit">
          Search
        </button>
      </form>
      <div className="dash-table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Detail</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {result.docs.length === 0 ? (
              <tr>
                <td colSpan={4}>Nothing here yet.</td>
              </tr>
            ) : (
              result.docs.map((doc) => {
                const row = doc as Subject | ArtStyle | Tool | ContentType
                const detail =
                  kind === 'tools'
                    ? `${(row as Tool).vendor || '—'} · ${(row as Tool).active === false ? 'Hidden' : 'Active'}`
                    : kind === 'content-types'
                      ? (row as ContentType).usesSteps
                        ? 'Uses steps'
                        : 'Single prompt'
                      : (row as Subject).colorHex || '—'
                return (
                  <tr key={row.id}>
                    <td data-label="Name">
                      <Link href={`${href}${row.id}/`}>{row.name}</Link>
                    </td>
                    <td data-label="Slug">{row.slug || '—'}</td>
                    <td data-label="Detail">{detail}</td>
                    <td data-label="Updated">{formatWhen(row.updatedAt)}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      <Pager page={result.page ?? 1} totalPages={result.totalPages} totalDocs={result.totalDocs} pathname={href} params={{ q }} />
    </>
  )
}

export async function TaxonomyEditor({
  kind,
  id,
  searchParams,
}: {
  kind: TaxonomyKind
  id?: number
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const meta = META[kind]
  const params = await searchParams
  const { payload, user } = await dashboardContext()
  const doc = id
    ? ((await findOrNotFound(() =>
        payload.findByID({ collection: kind, id, depth: 1, user, overrideAccess: false }),
      )) as Subject | ArtStyle | Tool | ContentType)
    : null

  return (
    <>
      <header className="dash-pagehead">
        <div>
          <p className="dash-kicker">{meta.title}</p>
          <h1>{doc ? doc.name : `New ${meta.singular.toLowerCase()}`}</h1>
          {doc?.slug ? <p className="dash-lead">Slug: {doc.slug}</p> : null}
        </div>
        <Link href={`/dashboard/${kind}/`}>All {meta.title.toLowerCase()}</Link>
      </header>
      <SavedNote saved={one(params.saved)} error={one(params.error)} />
      <ActionForm action={saveTaxonomy} className="dash-stack dash-panel" formKey={doc?.updatedAt ?? 'new'}>
        <input type="hidden" name="kind" value={kind} />
        {doc ? <input type="hidden" name="id" value={doc.id} /> : null}
        <div className="field">
          <label htmlFor="tax-name">Name</label>
          <input id="tax-name" className="input" name="name" defaultValue={doc?.name ?? ''} required />
          <p className="dash-hint">The slug is rewritten from this name when you save.</p>
        </div>
        {kind === 'subjects' ? <SubjectFields doc={doc as Subject | null} /> : null}
        {kind === 'art-styles' ? <StyleFields doc={doc as ArtStyle | null} /> : null}
        {kind === 'tools' ? <ToolFields doc={doc as Tool | null} /> : null}
        {kind === 'content-types' ? <TypeFields doc={doc as ContentType | null} /> : null}
        <div className="dash-inline">
          <SubmitButton>Save</SubmitButton>
          {doc ? <a className="btn btn-secondary" href={`/admin/collections/${kind}/${doc.id}`}>Open in Payload</a> : null}
        </div>
      </ActionForm>
      {doc ? (
        <div style={{ marginTop: 16 }}>
          <ConfirmForm action={deleteTaxonomy} message={`Delete ${doc.name}?`} label="Delete" hidden={{ kind, id: String(doc.id) }} />
        </div>
      ) : null}
    </>
  )
}

function SubjectFields({ doc }: { doc: Subject | null }) {
  return (
    <>
      <div className="field">
        <label htmlFor="tax-description">Description</label>
        <textarea id="tax-description" className="input" name="description" defaultValue={doc?.description ?? ''} />
      </div>
      <div className="dash-split">
        <div className="field">
          <label htmlFor="tax-color">Color</label>
          <input id="tax-color" className="input" name="colorHex" defaultValue={doc?.colorHex ?? ''} placeholder="#C9A227" />
        </div>
        <div className="field">
          <label htmlFor="tax-order">Sort order</label>
          <input id="tax-order" className="input" name="sortOrder" type="number" defaultValue={doc?.sortOrder ?? 0} />
        </div>
      </div>
      <ImagePicker label="Icon" hint="Optional. Shown with the subject." name="icon" initial={iconOf(doc?.icon)} clientUploads={clientUploadsEnabled()} />
    </>
  )
}

function StyleFields({ doc }: { doc: ArtStyle | null }) {
  return (
    <>
      <div className="dash-split">
        <div className="field">
          <label htmlFor="style-color">Color</label>
          <input id="style-color" className="input" name="colorHex" defaultValue={doc?.colorHex ?? ''} placeholder="#C9A227" />
        </div>
        <div className="field">
          <label htmlFor="style-order">Sort order</label>
          <input id="style-order" className="input" name="sortOrder" type="number" defaultValue={doc?.sortOrder ?? 0} />
        </div>
      </div>
      <StringList name="helps" label="Helps" hint="Words that work well for this style." initial={(doc?.wordChoiceGuide?.helps ?? []).map((row) => row.word || '').filter(Boolean)} />
      <StringList name="hurts" label="Hurts" hint="Words that fight this style." initial={(doc?.wordChoiceGuide?.hurts ?? []).map((row) => row.word || '').filter(Boolean)} />
    </>
  )
}

function ToolFields({ doc }: { doc: Tool | null }) {
  return (
    <>
      <div className="dash-split">
        <div className="field">
          <label htmlFor="tool-vendor">Vendor</label>
          <input id="tool-vendor" className="input" name="vendor" defaultValue={doc?.vendor ?? ''} placeholder="OpenAI, Google…" />
        </div>
        <div className="field">
          <label htmlFor="tool-order">Sort order</label>
          <input id="tool-order" className="input" name="sortOrder" type="number" defaultValue={doc?.sortOrder ?? 0} />
        </div>
      </div>
      <label className="dash-check">
        <input type="checkbox" name="supportsReferenceImage" defaultChecked={doc ? doc.supportsReferenceImage !== false : true} />
        Supports a reference image
      </label>
      <label className="dash-check">
        <input type="checkbox" name="supportsChains" defaultChecked={Boolean(doc?.supportsChains)} />
        Supports chains
      </label>
      <label className="dash-check">
        <input type="checkbox" name="active" defaultChecked={doc ? doc.active !== false : true} />
        Active in filters
      </label>
    </>
  )
}

function TypeFields({ doc }: { doc: ContentType | null }) {
  return (
    <>
      <div className="field">
        <label htmlFor="type-order">Sort order</label>
        <input id="type-order" className="input" name="sortOrder" type="number" defaultValue={doc?.sortOrder ?? 0} />
      </div>
      <label className="dash-check">
        <input type="checkbox" name="usesSteps" defaultChecked={Boolean(doc?.usesSteps)} />
        Uses the ordered steps list instead of a single prompt
      </label>
    </>
  )
}
