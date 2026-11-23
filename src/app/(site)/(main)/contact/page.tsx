import type { Metadata } from 'next'
import Link from 'next/link'
import { ContactForm } from '@/components/site/ContactForm'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Questions about a prompt, a submission, or premium.',
  alternates: { canonical: 'https://thepromptgalaxy.com/contact/' },
}

export default function ContactPage() {
  return (
    <div className="contact-split">
      <div style={{ padding: '56px 40px', borderRight: '2px solid var(--color-text)' }}>
        <span className="kicker">Contact</span>
        <h1 style={{ fontSize: 44, letterSpacing: '-0.03em', margin: '10px 0 16px' }}>Get in touch.</h1>
        <p style={{ margin: '0 0 32px', fontSize: 15, color: 'var(--color-neutral-700)', maxWidth: 420 }}>
          Questions about a prompt, a submission, or premium — send it over and we&apos;ll reply within two business days.
        </p>
        <ContactForm />
      </div>
      <div style={{ padding: '56px 40px', background: 'var(--color-surface)', display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div>
          <span className="footer-label">Email</span>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 6 }}>hello@thepromptgalaxy.com</div>
        </div>
        <div>
          <span className="footer-label">Submissions</span>
          <div style={{ fontSize: 15, marginTop: 6 }}>
            Use <Link href="/submit/">Submit a prompt</Link> instead of email — it routes straight to review.
          </div>
        </div>
        <div>
          <span className="footer-label">Response time</span>
          <div style={{ fontSize: 15, marginTop: 6 }}>Within 2 business days.</div>
        </div>
        <div style={{ borderTop: '2px solid var(--color-divider)', paddingTop: 24 }}>
          <span className="footer-label">Follow</span>
          <p style={{ margin: '10px 0 0', fontSize: 14, color: 'var(--color-neutral-700)' }}>Social profiles are not published yet.</p>
        </div>
      </div>
    </div>
  )
}
