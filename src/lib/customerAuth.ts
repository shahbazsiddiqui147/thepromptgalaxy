import { cookies } from 'next/headers'
import { getPayloadClient } from '@/lib/payload-client'
import type { Customer } from '@/payload-types'

// IMPORTANT: this must never be Payload's own auto-managed cookie name
// (`${cookiePrefix}-token`, i.e. "payload-token" for this project). The admin
// Users collection and the public Customers collection both use Payload's
// `auth: true`, and Payload's cookie name/path/domain is global to the whole
// config — not per-collection. If we let Payload manage its own cookie for
// customer logins, a customer session would collide with (and can silently
// invalidate) an admin's /admin session cookie on the same origin. Instead we
// mint our own cookie holding the raw JWT and verify it ourselves below via
// the Local API, entirely independent of Payload's cookie handling.
export const CUSTOMER_COOKIE_NAME = 'customer_session'

export async function getCurrentCustomer(): Promise<Customer | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(CUSTOMER_COOKIE_NAME)?.value
  if (!token) return null

  const payload = await getPayloadClient()

  // Verify the token via Payload's Local API using the header-based
  // Authorization: JWT extraction path, which works regardless of which
  // auth collection issued the token and does not depend on (or read)
  // Payload's own cookie at all.
  const { user } = await payload.auth({
    headers: new Headers({ Authorization: `JWT ${token}` }),
  })

  if (!user || user.collection !== 'customers') return null

  return user as Customer
}
