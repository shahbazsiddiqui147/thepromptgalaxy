import 'server-only'

import { notFound } from 'next/navigation'
import { getPayloadClient } from '@/lib/payload-client'
import { requireDashboardUser, type DashboardUser } from '@/lib/dashboard/session'
import type { Payload, Where } from 'payload'

export type FormState = { error: string | null; message: string | null }

export const idleFormState: FormState = { error: null, message: null }

export function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    String((error as { digest?: unknown }).digest).startsWith('NEXT_REDIRECT')
  )
}

export function formatPayloadError(error: unknown): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: { errors?: { message?: string }[] } }).data
    const messages = data?.errors?.map((item) => item.message).filter((message): message is string => Boolean(message))
    if (messages && messages.length > 0) return messages.join(' ')
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    if (message.includes('duplicate') || message.includes('unique') || message.includes('already exists')) {
      return 'A record with that name or email already exists.'
    }
    if (message.includes('foreign key') || message.includes('violates') || message.includes('constraint')) {
      return 'This record is still used elsewhere, so it can’t be deleted.'
    }
  }
  return 'Something went wrong. Check the fields and try again.'
}

export async function dashboardContext(): Promise<{ payload: Payload; user: DashboardUser }> {
  const user = await requireDashboardUser()
  const payload = await getPayloadClient()
  return { payload, user }
}

export function one(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

export function readPage(value: string | string[] | undefined): number {
  const n = Number(one(value))
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.floor(n)
}

export function readId(value: string): number {
  const id = Number(value)
  if (!Number.isInteger(id) || id < 1) notFound()
  return id
}

export function optionalId(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const id = Number(trimmed)
  if (!Number.isInteger(id) || id < 1) return null
  return id
}

export function textValue(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

export function checked(formData: FormData, name: string): boolean {
  return formData.get(name) === 'on'
}

export function numberValue(formData: FormData, name: string, fallback = 0): number {
  const raw = textValue(formData, name)
  if (!raw) return fallback
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

export function stringList(formData: FormData, name: string): string[] {
  const raw = textValue(formData, name)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
  } catch {
    return []
  }
}

export function andWhere(clauses: (Where | null | undefined | false)[]): Where | undefined {
  const present = clauses.filter((clause): clause is Where => Boolean(clause))
  if (present.length === 0) return undefined
  if (present.length === 1) return present[0]
  return { and: present }
}

export async function findOrNotFound<T>(load: () => Promise<T>): Promise<T> {
  try {
    return await load()
  } catch (error) {
    if (isNextRedirect(error)) throw error
    if (error && typeof error === 'object' && 'status' in error && (error as { status?: number }).status === 404) {
      notFound()
    }
    const message = error instanceof Error ? error.message.toLowerCase() : ''
    if (message.includes('not found')) notFound()
    throw error
  }
}

export function clientUploadsEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

export function pageHref(pathname: string, params: Record<string, string | undefined>, page: number): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value)
  }
  if (page > 1) search.set('page', String(page))
  const qs = search.toString()
  return qs ? `${pathname}?${qs}` : pathname
}

export function safeNextPath(value: FormDataEntryValue | null): string {
  if (typeof value !== 'string') return '/dashboard/'
  if (!value.startsWith('/dashboard')) return '/dashboard/'
  if (value.startsWith('//') || value.includes('://') || value.includes('\\') || value.includes('..')) return '/dashboard/'
  if (value === '/dashboard/login' || value.startsWith('/dashboard/login/') || value.startsWith('/dashboard/login?')) {
    return '/dashboard/'
  }
  return value
}
