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
  const prompts = await getPromptsByIds(savedIds)

  return (
    <div className="wrap" style={{ padding: '24px 24px 56px' }}>
      <h1 className="display" style={{ fontSize: 'clamp(28px, 5vw, 40px)', margin: '12px 0' }}>
        My Collection
      </h1>
      <p style={{ color: 'var(--fade)', fontSize: 14, marginBottom: 24 }}>
        Prompts you've saved for later.
      </p>

      {prompts.length === 0 ? (
        <div
          className="mono"
          style={{
            background: 'var(--ink-panel)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            padding: '18px 20px',
            color: 'var(--fade)',
            fontSize: 13,
          }}
        >
          Your collection is empty.{' '}
          <Link href="/" style={{ color: 'var(--amber)' }}>
            Browse prompts
          </Link>{' '}
          to find something to save.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 16,
          }}
        >
          {prompts.map((prompt) => (
            <PromptCard key={prompt.id} prompt={prompt} />
          ))}
        </div>
      )}
    </div>
  )
}
