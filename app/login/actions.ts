'use server'

import { redirect } from 'next/navigation'
import { authErrorMessage, readCredentials } from '@/lib/auth-feedback'
import { getAppUrl } from '@/lib/env'
import { createClient } from '@/lib/supabase/server'

export async function signIn(formData: FormData) {
  const { email, password } = readCredentials(formData)
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) redirect(`/login?error=${encodeURIComponent(authErrorMessage(error))}`)
  redirect('/app')
}

export async function signUp(formData: FormData) {
  const { email, password } = readCredentials(formData)
  if (password.length < 8) redirect(`/login?error=${encodeURIComponent('Use uma senha com pelo menos 8 caracteres.')}`)

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${getAppUrl()}/auth/callback?next=/onboarding` },
  })
  if (error) redirect(`/login?error=${encodeURIComponent(authErrorMessage(error))}`)
  if (data.session) redirect('/onboarding')
  redirect(`/login?message=${encodeURIComponent('Verifique seu e-mail para confirmar o acesso. Se você já tem uma conta, use Entrar ou Esqueci minha senha; criar conta novamente não altera sua senha.')}`)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
