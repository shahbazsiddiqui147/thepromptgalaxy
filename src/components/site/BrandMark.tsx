import Link from 'next/link'

export function BrandMark() {
  return (
    <Link href="/" className="brand">
      <span className="brand-mark" aria-hidden="true" />
      <span className="brand-name">ThePromptGalaxy</span>
    </Link>
  )
}
