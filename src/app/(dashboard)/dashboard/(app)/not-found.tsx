import Link from 'next/link'

export default function DashboardNotFound() {
  return (
    <div className="dash-panel">
      <h1>Not found</h1>
      <p>That record is not in the library.</p>
      <Link className="btn btn-primary" href="/dashboard/">
        Back to the dashboard
      </Link>
    </div>
  )
}
