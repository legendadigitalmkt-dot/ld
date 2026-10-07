function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export function getSupabasePublicEnv() {
  return {
    url: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    publishableKey: requireEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
  }
}

export function getSupabaseServiceRoleKey() {
  return requireEnv('SUPABASE_SERVICE_ROLE_KEY')
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}
