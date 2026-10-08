'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { authErrorMessage, readCredentials } from '@/lib/auth-feedback'
import { getAppUrl, getSupabasePublicEnv } from '@/lib/env'
import { createRecoveryClient } from '@/lib/supabase/recovery-client'

export async function requestPasswordReset(formData: FormData) {
  const { email } = readCredentials(formData)
  if (!email) redirect('/forgot-password?error=Informe%20seu%20e-mail.')
  const { url, publishableKey } = getSupabasePublicEnv()
  const { supabase, commitCookies } = createRecoveryClient(url, publishableKey, await cookies())
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getAppUrl()}/auth/callback?next=/reset-password`,
  })
  if (error) redirect(`/forgot-password?error=${encodeURIComponent(authErrorMessage(error))}`)
  commitCookies()
  redirect(`/forgot-password?message=${encodeURIComponent('Se houver uma conta com esse e-mail, você receberá um link para redefinir a senha. Abra o link neste mesmo navegador. Verifique também o spam.')}`)
}
