'use server'

import { redirect } from 'next/navigation'
import { authErrorMessage, readCredentials } from '@/lib/auth-feedback'
import { createClient } from '@/lib/supabase/server'

export async function resetPassword(formData: FormData) {
  const { password } = readCredentials(formData)
  const confirmation = String(formData.get('confirmation') || '')
  if (password.length < 8) redirect('/reset-password?error=Use%20uma%20senha%20com%20pelo%20menos%208%20caracteres.')
  if (password !== confirmation) redirect('/reset-password?error=As%20senhas%20precisam%20ser%20iguais.')

  const supabase = await createClient()
  const { data, error: userError } = await supabase.auth.getUser()
  if (userError || !data.user) redirect('/forgot-password?error=Solicite%20um%20novo%20link%20para%20recuperar%20o%20acesso.')
  const { error } = await supabase.auth.updateUser({ password })
  if (error) redirect(`/reset-password?error=${encodeURIComponent(authErrorMessage(error))}`)
  await supabase.auth.signOut()
  redirect(`/login?message=${encodeURIComponent('Senha atualizada. Entre com sua nova senha.')}`)
}
