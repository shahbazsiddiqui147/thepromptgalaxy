import type { Queryable } from '@/db/pool'
import { writeAudit } from '@/registry/audit'

export type SiteSettings = {
  socialX: string
  socialInstagram: string
  socialYoutube: string
  contactEmail: string
}

export const SETTING_FIELDS: { key: keyof SiteSettings; column: string; label: string; help: string; kind: 'url' | 'email' }[] = [
  { key: 'socialX', column: 'social_x', label: 'X (Twitter) address', help: 'Full address, e.g. https://x.com/yourname. Leave empty to hide the icon.', kind: 'url' },
  { key: 'socialInstagram', column: 'social_instagram', label: 'Instagram address', help: 'Full address. Leave empty to hide the icon.', kind: 'url' },
  { key: 'socialYoutube', column: 'social_youtube', label: 'YouTube address', help: 'Full address. Leave empty to hide the icon.', kind: 'url' },
  { key: 'contactEmail', column: 'contact_email', label: 'Contact email', help: 'Shown to visitors on the Contact page and in the footer.', kind: 'email' },
]

const EMPTY: SiteSettings = { socialX: '', socialInstagram: '', socialYoutube: '', contactEmail: '' }

export async function getSettings(db: Queryable): Promise<SiteSettings> {
  const { rows } = await db.query<{ key: string; value: string }>('SELECT key, value FROM site_settings')
  const byColumn = new Map(rows.map((r) => [r.key, r.value]))
  const out = { ...EMPTY }
  for (const field of SETTING_FIELDS) out[field.key] = byColumn.get(field.column) ?? ''
  return out
}

function validUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

export type SaveSettingsResult = { ok: true } | { ok: false; errors: Record<string, string> }

export async function saveSettings(db: Queryable, input: Partial<Record<keyof SiteSettings, string>>, actorId: number | null): Promise<SaveSettingsResult> {
  const errors: Record<string, string> = {}
  const clean = { ...EMPTY }
  for (const field of SETTING_FIELDS) {
    const value = String(input[field.key] ?? '').trim()
    if (value.length > 200) errors[field.key] = 'Must be at most 200 characters'
    else if (value !== '' && field.kind === 'url' && !validUrl(value)) errors[field.key] = 'Enter a full address starting with https://'
    else if (value !== '' && field.kind === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors[field.key] = 'Enter a valid email address'
    clean[field.key] = value
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors }

  for (const field of SETTING_FIELDS) {
    await db.query(
      `INSERT INTO site_settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [field.column, clean[field.key]],
    )
  }
  await writeAudit(db, { userId: actorId, entity: 'settings', entityId: null, action: 'update', diff: clean })
  return { ok: true }
}
