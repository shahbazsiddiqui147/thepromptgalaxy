import { getPool } from '@/db/pool'

export default async function AdminDashboard() {
  const { rows } = await getPool().query<{ categories: number; tools: number; styles: number; prompts: number; links: number }>(
    `SELECT (SELECT count(*)::int FROM categories) AS categories,
            (SELECT count(*)::int FROM tools) AS tools,
            (SELECT count(*)::int FROM styles) AS styles,
            (SELECT count(*)::int FROM prompts) AS prompts,
            (SELECT count(*)::int FROM category_tools) AS links`,
  )
  const counts = rows[0]
  return (
    <>
      <div className="admin-head">
        <h1>Dashboard</h1>
      </div>
      <table className="table">
        <tbody>
          <tr><td>Categories</td><td>{counts.categories}</td></tr>
          <tr><td>Tools</td><td>{counts.tools}</td></tr>
          <tr><td>Styles</td><td>{counts.styles}</td></tr>
          <tr><td>Category × tool links</td><td>{counts.links}</td></tr>
          <tr><td>Prompts</td><td>{counts.prompts}</td></tr>
        </tbody>
      </table>
    </>
  )
}
