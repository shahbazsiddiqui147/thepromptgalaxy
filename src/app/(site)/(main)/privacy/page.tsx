import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: 'How The Prompt Galaxy collects, uses, and stores account and submission data.',
  alternates: { canonical: 'https://thepromptgalaxy.com/privacy/' },
}

const SECTIONS = [
  {
    id: 'collect',
    title: '1. Information we collect',
    body: 'When you create an account we collect your email and a display name. When you submit a prompt we store the prompt text, category, tool and example image you provide. If you subscribe to Premium, payment is processed by our payment provider — we do not store card details.',
  },
  {
    id: 'use',
    title: '2. How we use it',
    body: 'We use your account information to run saves, submissions and Premium access, and your email to send service updates. We do not sell your data to third parties.',
  },
  {
    id: 'cookies',
    title: '3. Cookies',
    body: 'We use cookies to keep you signed in and to remember filter preferences like your last selected tool or category. You can disable cookies in your browser, though parts of the site may stop working correctly.',
  },
  {
    id: 'content',
    title: '4. Submitted content',
    body: 'Prompts and example images you submit are reviewed before publishing and, once published, are shown publicly with your display name attributed as the author.',
  },
  {
    id: 'rights',
    title: '5. Your rights',
    body: 'You can request a copy of your data or ask us to delete your account at any time by contacting us. Deleting your account removes your saved prompts; published submissions remain unless you request removal separately.',
  },
  {
    id: 'contact',
    title: '6. Contact',
    body: 'Questions about this policy can be sent through the contact page or to privacy@thepromptgalaxy.com.',
  },
]

export default function PrivacyPage() {
  return (
    <div className="privacy-layout">
      <div className="privacy-nav">
        <span className="footer-label">On this page</span>
        {SECTIONS.map((section) => (
          <a key={section.id} href={`#${section.id}`}>
            {section.title}
          </a>
        ))}
      </div>
      <div style={{ padding: '48px 32px' }}>
        <span className="kicker">Legal</span>
        <h1 style={{ fontSize: 44, letterSpacing: '-0.03em', margin: '10px 0 8px' }}>Privacy policy</h1>
        <p style={{ margin: '0 0 32px', fontSize: 13, color: 'var(--color-neutral-600)' }}>Last updated September 24, 2026</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, fontSize: 15, color: 'var(--color-neutral-800)', lineHeight: 1.6 }}>
          {SECTIONS.map((section) => (
            <div key={section.id} id={section.id}>
              <h2 style={{ fontSize: 20, margin: '0 0 8px' }}>{section.title}</h2>
              <p style={{ margin: 0 }}>
                {section.id === 'contact' ? (
                  <>
                    Questions about this policy can be sent to <Link href="/contact/">our contact page</Link> or privacy@thepromptgalaxy.com.
                  </>
                ) : (
                  section.body
                )}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
