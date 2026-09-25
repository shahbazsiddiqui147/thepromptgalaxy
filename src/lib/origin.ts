/** CSRF guard for route handlers: the Origin header must name the same host the request was sent to. */
export function isSameOrigin(origin: string | null, host: string | null): boolean {
  if (!origin || !host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}
