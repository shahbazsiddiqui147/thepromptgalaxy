'use client'

import React, { useEffect, useState } from 'react'
import { Eye } from 'lucide-react'
import { useAllFormFields, useConfig } from '@payloadcms/ui'

// Sidebar "Live Preview" panel for the Prompts editor. Renders a mini version
// of the public site's card (see src/components/PromptCard.tsx) using the
// document's CURRENT, UNSAVED form state (title/blurb/subject/artStyle), so
// an editor can see roughly how a prompt will look without opening the live
// site in another tab. This is a simplified re-implementation of that card's
// look, not a shared component with the public site (the admin panel and the
// public Next.js app are separate bundles) -- it can drift from the real
// design over time and should be spot-checked against PromptCard.tsx if that
// component's visual style changes.

type TaxonomyOption = {
  id: number | string
  name: string
  colorHex?: string | null
}

export function LivePreview() {
  const [fields] = useAllFormFields()
  const { config } = useConfig()
  const { routes, serverURL } = config

  const [subjects, setSubjects] = useState<TaxonomyOption[] | null>(null)
  const [artStyles, setArtStyles] = useState<TaxonomyOption[] | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [subjectsRes, artStylesRes] = await Promise.all([
          fetch(`${serverURL}${routes.api}/subjects?limit=100&depth=0`, { credentials: 'include' }),
          fetch(`${serverURL}${routes.api}/art-styles?limit=100&depth=0`, { credentials: 'include' }),
        ])
        const subjectsData = await subjectsRes.json()
        const artStylesData = await artStylesRes.json()
        if (!cancelled) {
          setSubjects(
            (subjectsData?.docs ?? []).map((d: Record<string, unknown>) => ({
              id: d.id,
              name: d.name,
              colorHex: d.colorHex,
            })),
          )
          setArtStyles(
            (artStylesData?.docs ?? []).map((d: Record<string, unknown>) => ({
              id: d.id,
              name: d.name,
              colorHex: d.colorHex,
            })),
          )
        }
      } catch {
        // Non-critical — the preview just falls back to showing no color/name
        // for the taxonomy tags if this fetch fails, rather than breaking the
        // rest of the edit view.
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [serverURL, routes.api])

  const title = (fields?.title?.value as string | undefined) ?? ''
  const blurb = (fields?.blurb?.value as string | undefined) ?? ''
  const subjectId = fields?.subject?.value as number | string | undefined
  const artStyleId = fields?.artStyle?.value as number | string | undefined

  const subject = subjects?.find((s) => String(s.id) === String(subjectId))
  const artStyle = artStyles?.find((s) => String(s.id) === String(artStyleId))

  const truncatedBlurb = blurb.length > 70 ? `${blurb.slice(0, 70)}…` : blurb

  return (
    <div
      style={{
        background: 'var(--theme-elevation-0)',
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
        <Eye size={15} color="#C9A227" />
        <span style={{ fontSize: 13.5, fontWeight: 700 }}>Live Preview</span>
      </div>

      <div
        style={{
          background: '#12141F',
          borderRadius: 6,
          overflow: 'hidden',
          border: '1px solid #2A2E42',
        }}
      >
        <div
          style={{
            width: '100%',
            aspectRatio: '16 / 10',
            background: `linear-gradient(135deg, ${subject?.colorHex ?? '#3A3F5C'}88, #12141F)`,
          }}
        />
        <div style={{ padding: '10px 12px 12px' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {subject && (
              <span
                style={{
                  fontSize: 9.5,
                  background: subject.colorHex ?? '#3A3F5C',
                  color: '#12141F',
                  padding: '3px 7px',
                  borderRadius: 2,
                  fontWeight: 700,
                }}
              >
                {subject.name}
              </span>
            )}
            {artStyle && (
              <span
                style={{
                  fontSize: 9.5,
                  background: artStyle.colorHex ?? '#3A3F5C',
                  color: '#12141F',
                  padding: '3px 7px',
                  borderRadius: 2,
                  fontWeight: 700,
                }}
              >
                {artStyle.name}
              </span>
            )}
          </div>
          <div style={{ color: '#E8ECF5', fontWeight: 700, fontSize: 13.5, marginBottom: 6 }}>
            {title || 'Untitled'}
          </div>
          <div style={{ color: '#8A8FA8', fontSize: 11, lineHeight: 1.4 }}>
            {truncatedBlurb || 'No blurb yet'}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 11, color: 'var(--theme-elevation-500)', marginTop: 10, lineHeight: 1.5 }}>
        How this prompt looks as a card on the homepage and browse page — updates as you edit fields on the left.
      </div>
    </div>
  )
}
