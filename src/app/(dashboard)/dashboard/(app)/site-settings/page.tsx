import type { Metadata } from 'next'
import { saveSiteSettings } from '@/lib/dashboard/actions/records'
import { clientUploadsEnabled, dashboardContext, one } from '@/lib/dashboard/http'
import { ImagePicker } from '@/components/dashboard/ImagePicker'
import { ActionForm, SavedNote, SubmitButton } from '@/components/dashboard/ui'
import type { UploadedMedia } from '@/components/dashboard/uploadMedia'
import type { Media } from '@/payload-types'

export const metadata: Metadata = { title: 'Site settings' }

function mediaOf(value: number | Media | null | undefined): UploadedMedia | null {
  if (!value || typeof value !== 'object') return null
  return {
    id: value.id,
    alt: value.alt,
    filename: value.filename ?? null,
    url: value.url ?? null,
    thumb: value.sizes?.thumbnail?.url || value.url || null,
  }
}

export default async function SiteSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const { payload, user } = await dashboardContext()
  const settings = await payload.findGlobal({
    slug: 'site-settings',
    depth: 1,
    user,
    overrideAccess: false,
  })

  return (
    <>
      <header className="dash-pagehead">
        <div>
          <p className="dash-kicker">Settings</p>
          <h1>Site settings</h1>
          <p className="dash-lead">Logo and favicon shown across the public site. Leave a field empty to keep the text wordmark or the default icon.</p>
        </div>
      </header>
      <SavedNote saved={one(params.saved)} />
      <ActionForm action={saveSiteSettings} className="dash-stack dash-panel" formKey={settings.updatedAt ?? 'settings'}>
        <ImagePicker
          name="logo"
          label="Logo"
          hint="Shown in the site header in place of the text wordmark."
          initial={mediaOf(settings.logo)}
          clientUploads={clientUploadsEnabled()}
        />
        <ImagePicker
          name="favicon"
          label="Favicon"
          hint="Browser tab icon. PNG or SVG, square aspect ratio recommended."
          initial={mediaOf(settings.favicon)}
          clientUploads={clientUploadsEnabled()}
        />
        <SubmitButton>Save settings</SubmitButton>
      </ActionForm>
    </>
  )
}
