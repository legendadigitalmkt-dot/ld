import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type AuthUser = {
  id: string
  email: string | null
}

export async function requireUser(): Promise<AuthUser> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  const claims = data?.claims

  if (error || !claims?.sub) redirect('/login')

  return {
    id: String(claims.sub),
    email: typeof claims.email === 'string' ? claims.email : null,
  }
}
