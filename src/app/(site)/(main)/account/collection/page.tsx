import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentCustomer } from '@/lib/customerAuth'
import { getPromptsByIds } from '@/lib/queries'
import { extractSavedPromptIds } from '@/lib/savedPrompts'
import { PromptCard } from '@/components/PromptCard'

export const metadata: Metadata = {
  title: 'My Collection',
  robots: { index: false, follow: true },
}

export default async function CollectionPage() {
  const customer = await getCurrentCustomer()
  if (!customer) redirect('/login')

  const savedIds = extractSavedPromptIds(customer.savedPrompts)
  const fetchedPrompts = await getPromptsByIds(savedIds)
  const promptsById = new Map(fetchedPrompts.map((prompt) => [prompt.id, prompt]))
  const prompts = [...savedIds]
    .reverse()
    .map((id) => promptsById.get(id))
    .filter((prompt) => prompt !== undefined)

  return (
    <div className="page-pad" style={{ paddingTop: 40, paddingBottom: 56 }}>
      <span className="kicker">Saved</span>
      <h1 style={{ fontSize: 40, letterSpacing: '-0.03em', margin: '10px 0 12px' }}>My collection</h1>
      <p style={{ color: 'var(--color-neutral-700)', fontSize: 14, marginBottom: 24 }}>Prompts you&apos;ve saved for later.</p>
      {prompts.length === 0 ? (
        <p className="empty-state">
          Your collection is empty. <Link href="/browse/">Browse prompts</Link> to find something to save.
        </p>
      ) : (
        <div className="card-grid">
          {prompts.map((prompt) => (
            <PromptCard key={prompt.id} prompt={prompt} />
          ))}
        </div>
      )}
    </div>
  )
}
