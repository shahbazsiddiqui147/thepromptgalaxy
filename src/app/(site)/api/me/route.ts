import { NextResponse } from 'next/server'
import { getCurrentCustomer } from '@/lib/customerAuth'
import { getPayloadClient } from '@/lib/payload-client'
import { extractSavedPromptIds } from '@/lib/savedPrompts'

// Small, dedicated endpoint for the client-side "personalized island" pattern:
// the prompt detail page stays fully static/ISR (see revalidate export on
// that page), and a client component fetches this route after hydration to
// find out whether the current visitor is logged in and what they've saved.
//
// This lives at the literal path `/api/me`, which Next.js's route sorter
// always resolves ahead of the catch-all `/api/[...slug]` in
// src/app/(payload)/api/[...slug]/route.ts (static segments are prioritized
// over catch-all segments — see sorted-routes.ts's `_smoosh()`), so this does
// not shadow or conflict with Payload's own REST API.

export async function GET() {
  const customer = await getCurrentCustomer()

  if (!customer) {
    return NextResponse.json({ loggedIn: false })
  }

  return NextResponse.json({
    loggedIn: true,
    savedPromptIds: extractSavedPromptIds(customer.savedPrompts),
  })
}

export async function POST(request: Request) {
  const customer = await getCurrentCustomer()
  if (!customer) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const promptId = (body as { promptId?: unknown } | null)?.promptId
  if (typeof promptId !== 'number' || !Number.isInteger(promptId) || promptId <= 0) {
    return NextResponse.json({ error: 'invalid_prompt_id' }, { status: 400 })
  }

  const payload = await getPayloadClient()

  // Re-fetch the customer's savedPrompts fresh here rather than trusting the
  // value from getCurrentCustomer() above — that value could already be
  // slightly stale by the time this line runs, and using it would widen the
  // window for a lost update under concurrent toggles.
  const current = await payload.findByID({ collection: 'customers', id: customer.id })
  const currentIds = extractSavedPromptIds(current.savedPrompts)

  const alreadySaved = currentIds.includes(promptId)
  const nextIds = alreadySaved
    ? currentIds.filter((id) => id !== promptId)
    : [...new Set([...currentIds, promptId])]

  await payload.update({
    collection: 'customers',
    id: customer.id,
    data: { savedPrompts: nextIds },
  })

  return NextResponse.json({ saved: !alreadySaved })
}
