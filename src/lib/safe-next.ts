/** Only allow redirecting to a path on this same site after login. */
export function safeNextPath(input: string, fallback = '/admin/'): string {
  if (!input.startsWith('/') || input.startsWith('//') || input.includes('\\')) {
    return fallback
  }
  return input
}
