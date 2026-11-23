'use client'

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="dash-panel">
      <h1>Could not load this page</h1>
      <p>The dashboard hit an error talking to the CMS. Nothing was changed.</p>
      <button className="btn btn-primary" type="button" onClick={() => reset()}>
        Try again
      </button>
    </div>
  )
}
