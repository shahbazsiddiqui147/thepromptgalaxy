import type { Metadata } from 'next'
import { saveAdSettings } from '@/lib/dashboard/actions/records'
import { dashboardContext, one } from '@/lib/dashboard/http'
import { ActionForm, SavedNote, SubmitButton } from '@/components/dashboard/ui'

export const metadata: Metadata = { title: 'Ad settings' }

export default async function AdSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const { payload, user } = await dashboardContext()
  const settings = await payload.findGlobal({
    slug: 'ad-settings',
    depth: 0,
    user,
    overrideAccess: false,
  })

  return (
    <>
      <header className="dash-pagehead">
        <div>
          <p className="dash-kicker">Settings</p>
          <h1>Ad settings</h1>
          <p className="dash-lead">Master switch and the embed code for each slot. An empty slot stays blank on the site.</p>
        </div>
      </header>
      <SavedNote saved={one(params.saved)} />
      <ActionForm action={saveAdSettings} className="dash-stack dash-panel" formKey={settings.updatedAt ?? 'ads'}>
        <label className="dash-check">
          <input type="checkbox" name="enabled" defaultChecked={Boolean(settings.enabled)} />
          Ads enabled site-wide
        </label>
        <div className="field">
          <label htmlFor="ad-leader">Leaderboard code</label>
          <textarea id="ad-leader" className="input dash-tall" name="leaderboardCode" defaultValue={settings.leaderboardCode ?? ''} spellCheck={false} />
          <p className="dash-hint">Top of the prompt page, such as a 728×90 banner.</p>
        </div>
        <div className="field">
          <label htmlFor="ad-content">In-content code</label>
          <textarea id="ad-content" className="input dash-tall" name="inContentCode" defaultValue={settings.inContentCode ?? ''} spellCheck={false} />
          <p className="dash-hint">Shown below the prompt text.</p>
        </div>
        <div className="field">
          <label htmlFor="ad-side">Sidebar code</label>
          <textarea id="ad-side" className="input dash-tall" name="sidebarCode" defaultValue={settings.sidebarCode ?? ''} spellCheck={false} />
        </div>
        <SubmitButton>Save ads</SubmitButton>
      </ActionForm>
    </>
  )
}
