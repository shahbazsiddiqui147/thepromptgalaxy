export default function DashboardLoading() {
  return (
    <div className="dash-skeleton" aria-busy="true" aria-label="Loading">
      <i style={{ height: 36, width: '40%' }} />
      <i style={{ height: 120 }} />
      <i style={{ height: 240 }} />
    </div>
  )
}
