export function getSupabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url) throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL')
  if (!publishableKey) throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')

  return { url, publishableKey }
}

export function getSupabaseServiceRoleKey() {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!value) throw new Error('Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY')
  return value
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}


export function getMetaGraphApiVersion() {
  return process.env.META_GRAPH_API_VERSION || 'v26.0'
}

export function getMetaWhatsAppAccessToken() {
  const value = process.env.META_WHATSAPP_ACCESS_TOKEN
  if (!value) throw new Error('Missing required environment variable: META_WHATSAPP_ACCESS_TOKEN')
  return value
}

export function getMetaAppSecret() {
  const value = process.env.META_APP_SECRET
  if (!value) throw new Error('Missing required environment variable: META_APP_SECRET')
  return value
}

export function getMetaWebhookVerifyToken() {
  const value = process.env.META_WEBHOOK_VERIFY_TOKEN
  if (!value) throw new Error('Missing required environment variable: META_WEBHOOK_VERIFY_TOKEN')
  return value
}
