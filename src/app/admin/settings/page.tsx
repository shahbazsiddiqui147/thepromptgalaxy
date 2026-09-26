import { getPool } from '@/db/pool'
import { requireUser } from '@/lib/current-user'
import { getSettings } from '@/site/settings'
import { SettingsForm } from './SettingsForm'

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireUser(['admin', 'editor'])
  const { saved } = await searchParams
  return (
    <>
      <div className="admin-head">
        <h1>Site settings</h1>
      </div>
      {saved ? <div className="banner">Saved.</div> : null}
      <SettingsForm values={await getSettings(getPool())} />
    </>
  )
}
