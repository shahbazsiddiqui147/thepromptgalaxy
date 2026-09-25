import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPool } from '@/db/pool'
import { requireUser } from '@/lib/current-user'
import { getPromptForEdit } from '@/prompts/repo'
import { loadFormOptions } from '../options'
import { PromptForm } from '../PromptForm'

export default async function EditPromptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ saved?: string }>
}) {
  await requireUser(['admin', 'editor'])
  const { id: idText } = await params
  const id = Number(idText)
  if (!Number.isInteger(id)) notFound()
  const prompt = await getPromptForEdit(getPool(), id)
  if (!prompt) notFound()
  const { saved } = await searchParams
  const { publishedAt, id: promptId, ...initial } = prompt

  return (
    <>
      <div className="admin-head">
        <h1>Edit prompt</h1>
        <Link className="btn btn-secondary" href="/admin/prompts/">
          Back to prompts
        </Link>
      </div>
      {saved ? <div className="banner">Saved.</div> : null}
      <PromptForm id={promptId} initial={initial} slugLocked={publishedAt !== null} options={await loadFormOptions(promptId)} />
    </>
  )
}
