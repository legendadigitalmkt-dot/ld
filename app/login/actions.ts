'use server'

import { redirect } from 'next/navigation'
import { getAppUrl } from '@/lib/env'
import { createClient } from '@/lib/supabase/server'

function value(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim()
}

export async function signIn(formData: FormData) {
  const email = value(formData, 'email').toLowerCase()
  const password = value(formData, 'password')
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) redirect(`/login?error=${encodeURIComponent('E-mail ou senha inválidos.')}`)
  redirect('/app')
}

export async function signUp(formData: FormData) {
  const email = value(formData, 'email').toLowerCase()
  const password = value(formData, 'password')
  if (password.length < 8) redirect(`/login?error=${encodeURIComponent('Use uma senha com pelo menos 8 caracteres.')}`)

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${getAppUrl()}/auth/callback?next=/onboarding` },
  })
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`)
  redirect(`/login?message=${encodeURIComponent('Conta criada. Verifique seu e-mail para confirmar o acesso.')}`)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
