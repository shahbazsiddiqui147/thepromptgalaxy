import { getPool } from '@/db/pool'
import { getLlmsText } from '@/site/llms'

export const dynamic = 'force-dynamic'

export async function GET() {
  const base = process.env.SITE_URL ?? 'https://thepromptgalaxy.com'
  const text = await getLlmsText(getPool(), base)
  return new Response(text, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  })
}
