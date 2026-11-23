import { redirect } from 'next/navigation'

export default async function SignupRedirect({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  redirect(error ? `/register/?error=${encodeURIComponent(error)}` : '/register/')
}
