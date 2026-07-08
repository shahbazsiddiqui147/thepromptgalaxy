'use client'

import { useState } from 'react'
import { JsonLd } from './JsonLd'

type Faq = { question: string; answer: string }

export function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  }

  return (
    <div style={{ marginTop: 40 }}>
      <JsonLd data={schema} />
      <div className="mono" style={{ fontSize: 11, color: 'var(--fade)', letterSpacing: '0.15em', marginBottom: 4 }}>
        FREQUENTLY ASKED QUESTIONS
      </div>
      {faqs.map((f, i) => (
        <div key={f.question} style={{ borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '14px 4px',
              textAlign: 'left',
              color: 'var(--paper)',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            <span>{f.question}</span>
            <span style={{ color: 'var(--amber)' }}>{openIndex === i ? '−' : '+'}</span>
          </button>
          {openIndex === i && (
            <p style={{ color: 'var(--fade)', fontSize: 13.5, lineHeight: 1.55, margin: '0 4px 16px' }}>
              {f.answer}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
