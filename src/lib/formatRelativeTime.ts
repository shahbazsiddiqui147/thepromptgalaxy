// Small local "time ago" formatter -- no new npm dependency needed for a
// homepage carousel label. Not meant to be exhaustive, just human-readable
// at the granularities this site actually publishes content (minutes through
// years).
export function formatRelativeTime(date: string | Date): string {
  const then = typeof date === 'string' ? new Date(date) : date
  const diffMs = Date.now() - then.getTime()
  const diffSec = Math.max(0, Math.floor(diffMs / 1000))
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`
  if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`
  if (diffDay === 1) return 'Yesterday'
  if (diffDay < 7) return `${diffDay} days ago`
  if (diffDay < 30) {
    const weeks = Math.floor(diffDay / 7)
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`
  }
  if (diffDay < 365) {
    const months = Math.floor(diffDay / 30)
    return `${months} month${months === 1 ? '' : 's'} ago`
  }
  const years = Math.floor(diffDay / 365)
  return `${years} year${years === 1 ? '' : 's'} ago`
}
