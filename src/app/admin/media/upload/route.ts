import { NextResponse } from 'next/server'
import { getPool } from '@/db/pool'
import { getCurrentUser } from '@/lib/current-user'
import { isSameOrigin } from '@/lib/origin'
import { getUploadsDir } from '@/lib/uploads-dir'
import { ImageError } from '@/media/process'
import { saveUpload } from '@/media/storage'

export async function POST(request: Request) {
  if (!isSameOrigin(request.headers.get('origin'), request.headers.get('host'))) {
    return NextResponse.json({ error: 'Cross-site request refused.' }, { status: 403 })
  }
  const user = await getCurrentUser()
  if (!user || (user.role !== 'admin' && user.role !== 'editor')) {
    return NextResponse.json({ error: 'Not allowed.' }, { status: 401 })
  }

  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Choose an image to upload.' }, { status: 400 })

  try {
    const row = await saveUpload(
      getPool(),
      getUploadsDir(),
      { buffer: Buffer.from(await file.arrayBuffer()), originalName: file.name },
      { alt: String(form.get('alt') ?? ''), createdBy: user.id },
    )
    return NextResponse.json({ id: row.id, alt: row.alt, width: row.width, height: row.height })
  } catch (error) {
    if (error instanceof ImageError) return NextResponse.json({ error: error.message }, { status: 422 })
    throw error
  }
}
