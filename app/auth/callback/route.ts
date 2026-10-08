import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authErrorMessage, authRedirectPath } from '@/lib/auth-feedback'
import { getAppUrl } from '@/lib/env'

function redirectToPublicApp(path: string) {
  // Route Handler request.url may contain the internal Node bind address behind a proxy.
  // Use the configured public origin, never the internal host or an untrusted Host header.
  const response = NextResponse.redirect(new URL(path, getAppUrl()))
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = authRedirectPath(url.searchParams.get('next'))
  const providerError = url.searchParams.get('error_code')
  if (providerError) {
    return redirectToPublicApp(`/login?error=${encodeURIComponent(authErrorMessage({ code: providerError }))}`)
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return redirectToPublicApp(next)
    return redirectToPublicApp(`/login?error=${encodeURIComponent(authErrorMessage(error))}`)
  }

  const message = 'O link não pôde ser confirmado. Ele pode ter expirado ou já ter sido usado. Solicite um novo link e abra no mesmo navegador.'
  return redirectToPublicApp(`/login?error=${encodeURIComponent(message)}`)
}
