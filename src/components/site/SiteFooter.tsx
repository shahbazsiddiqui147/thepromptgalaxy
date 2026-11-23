import Link from 'next/link'
import { SocialIcons } from '@/components/site/SocialIcons'

export function SiteFooter({
  promptCount,
  subjectCount,
  toolCount,
}: {
  promptCount: number
  subjectCount: number
  toolCount: number
}) {
  const blurb =
    promptCount > 0
      ? `${promptCount.toLocaleString('en-US')} tested prompts across ${toolCount} tools and ${subjectCount} categories.`
      : `Tested prompts across ${toolCount} tools and ${subjectCount} categories.`

  return (
    <footer>
      <div className="site-footer footer-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="brand-mark" style={{ width: 16, height: 16 }} aria-hidden="true" />
            <span className="brand-name" style={{ fontSize: 16 }}>
              ThePromptGalaxy
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--color-neutral-700)', maxWidth: 260 }}>{blurb}</p>
          <SocialIcons />
        </div>
        <div className="footer-col">
          <span className="footer-label">Explore</span>
          <Link href="/#categories">By category</Link>
          <Link href="/tool/">By tool</Link>
          <Link href="/search/">Search</Link>
        </div>
        <div className="footer-col">
          <span className="footer-label">Contribute</span>
          <Link href="/submit/">Submit a prompt</Link>
          <Link href="/premium/">Go Premium</Link>
        </div>
        <div className="footer-col">
          <span className="footer-label">Company</span>
          <Link href="/about/">About</Link>
          <Link href="/contact/">Contact</Link>
          <Link href="/privacy/">Privacy</Link>
        </div>
      </div>
      <div className="legal-bar">© {new Date().getFullYear()} ThePromptGalaxy</div>
    </footer>
  )
}
