import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabasePublicEnv } from '@/lib/env'

function redirectWithCookies(request: NextRequest, source: NextResponse, pathname: string) {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  url.search = ''
  const response = NextResponse.redirect(url)
  source.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie)
  })
  for (const header of ['cache-control', 'expires', 'pragma']) {
    const value = source.headers.get(header)
    if (value) response.headers.set(header, value)
  }
  return response
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const { url, publishableKey } = getSupabasePublicEnv()

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const { data, error } = await supabase.auth.getClaims()
  const isAuthenticated = !error && Boolean(data?.claims?.sub)
  const pathname = request.nextUrl.pathname

  if (pathname.startsWith('/app') && !isAuthenticated) {
    return redirectWithCookies(request, response, '/login')
  }
  if (pathname === '/onboarding' && !isAuthenticated) {
    return redirectWithCookies(request, response, '/login')
  }
  if (pathname === '/login' && isAuthenticated) {
    return redirectWithCookies(request, response, '/app')
  }

  return response
}
