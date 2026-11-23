'use server'

import { redirect } from 'next/navigation'
import { dashboardContext, formatPayloadError, isNextRedirect, optionalId, textValue, type FormState } from '@/lib/dashboard/http'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function saveUser(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = optionalId(formData.get('id'))
  const email = textValue(formData, 'email').toLowerCase()
  const name = textValue(formData, 'name')
  const password = String(formData.get('password') ?? '')

  if (!email || !EMAIL_RE.test(email)) return { error: 'Enter a valid email.', message: null }
  if (!id && password.length < 8) return { error: 'Password must be at least 8 characters.', message: null }
  if (id && password && password.length < 8) return { error: 'New password must be at least 8 characters.', message: null }

  const { payload, user } = await dashboardContext()
  const data: { email: string; name: string; password?: string } = { email, name }
  if (password) data.password = password

  try {
    const doc = id
      ? await payload.update({
          collection: 'users',
          id,
          data,
          depth: 0,
          user,
          overrideAccess: false,
        })
      : await payload.create({
          collection: 'users',
          data: { ...data, password },
          depth: 0,
          user,
          overrideAccess: false,
        })
    redirect(`/dashboard/users/${doc.id}/?saved=1`)
  } catch (error) {
    if (isNextRedirect(error)) throw error
    return { error: formatPayloadError(error), message: null }
  }
}

export async function deleteUser(formData: FormData): Promise<void> {
  const id = optionalId(formData.get('id'))
  if (!id) redirect('/dashboard/users/')
  const { payload, user } = await dashboardContext()
  if (user.id === id) redirect(`/dashboard/users/${id}/?error=self`)
  try {
    await payload.delete({ collection: 'users', id, user, overrideAccess: false })
  } catch (error) {
    if (isNextRedirect(error)) throw error
    redirect(`/dashboard/users/${id}/?error=delete`)
  }
  redirect('/dashboard/users/?deleted=1')
}
