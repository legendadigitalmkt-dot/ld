'use server'

import { redirect } from 'next/navigation'
import { authErrorMessage, readCredentials } from '@/lib/auth-feedback'
import { getAppUrl } from '@/lib/env'
import { createClient } from '@/lib/supabase/server'

export async function requestPasswordReset(formData: FormData) {
  const { email } = readCredentials(formData)
  if (!email) redirect('/forgot-password?error=Informe%20seu%20e-mail.')
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getAppUrl()}/auth/callback?next=/reset-password`,
  })
  if (error) redirect(`/forgot-password?error=${encodeURIComponent(authErrorMessage(error))}`)
  redirect(`/forgot-password?message=${encodeURIComponent('Se houver uma conta com esse e-mail, você receberá um link para redefinir a senha. Abra o link neste mesmo navegador. Verifique também o spam.')}`)
}
