import { createServerClient, type CookieOptions } from '@supabase/ssr'

type Cookie = { name: string; value: string; options: CookieOptions }
type CookieStore = {
  getAll(): { name: string; value: string }[]
  set(name: string, value: string, options: CookieOptions): unknown
}

export function createRecoveryClient(url: string, publishableKey: string, store: CookieStore) {
  const current = new Map(store.getAll().map(({ name, value }) => [name, value]))
  const pending = new Map<string, Cookie>()
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return Array.from(current, ([name, value]) => ({ name, value }))
      },
      setAll(cookiesToSet) {
        for (const cookie of cookiesToSet) {
          current.set(cookie.name, cookie.value)
          pending.set(cookie.name, cookie)
        }
      },
    },
  })

  return {
    supabase,
    commitCookies() {
      // A failed/rate-limited recovery request must not overwrite the verifier
      // for an email already sent. Commit the new cookies only on success.
      for (const { name, value, options } of pending.values()) store.set(name, value, options)
    },
  }
}
