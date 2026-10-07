import 'server-only'

import {
  getAppUrl,
  getMetaAppSecret,
  getMetaGraphApiVersion,
  getMetaWebhookVerifyToken,
  getMetaWhatsAppAccessToken,
} from '@/lib/env'
import { verifyHmacSha256 } from '@/lib/meta/webhook-signature'

type MetaErrorPayload = {
  error?: {
    message?: string
    type?: string
    code?: number
    error_subcode?: number
    fbtrace_id?: string
  }
}

export type WhatsAppPhoneNumber = {
  id: string
  display_phone_number?: string
  verified_name?: string
  quality_rating?: string
}

type SendMessageResponse = {
  messaging_product?: 'whatsapp'
  contacts?: Array<{ input?: string; wa_id?: string }>
  messages?: Array<{ id: string; message_status?: string }>
}

function graphUrl(path: string) {
  return `https://graph.facebook.com/${getMetaGraphApiVersion()}/${path.replace(/^\//, '')}`
}

async function metaRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(graphUrl(path), {
    ...init,
    headers: {
      Authorization: `Bearer ${getMetaWhatsAppAccessToken()}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    cache: 'no-store',
  })

  const payload = (await response.json().catch(() => ({}))) as T & MetaErrorPayload

  if (!response.ok) {
    const meta = payload as MetaErrorPayload
    const message = meta.error?.message || `Meta Graph API request failed with HTTP ${response.status}`
    throw new Error(message)
  }

  return payload
}

export function verifyWhatsAppWebhookSignature(rawBody: Uint8Array, signatureHeader: string | null) {
  if (!signatureHeader?.startsWith('sha256=')) return false

  return verifyHmacSha256(rawBody, signatureHeader, getMetaAppSecret())
}

export function verifyWhatsAppWebhookChallenge(mode: string | null, token: string | null) {
  return mode === 'subscribe' && Boolean(token) && token === getMetaWebhookVerifyToken()
}

export function getWhatsAppWebhookUrl() {
  return `${getAppUrl().replace(/\/$/, '')}/api/webhooks/meta/whatsapp`
}

export async function getWhatsAppBusinessPhoneNumbers(wabaId: string) {
  const result = await metaRequest<{ data?: WhatsAppPhoneNumber[] }>(
    `${encodeURIComponent(wabaId)}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating`,
  )
  return result.data || []
}

export async function subscribeWhatsAppBusinessAccount(wabaId: string) {
  const webhookUrl = getWhatsAppWebhookUrl()
  const useOverride = webhookUrl.startsWith('https://')

  return metaRequest<{ success?: boolean; data?: unknown }>(
    `${encodeURIComponent(wabaId)}/subscribed_apps`,
    {
      method: 'POST',
      body: useOverride
        ? JSON.stringify({
            override_callback_uri: webhookUrl,
            verify_token: getMetaWebhookVerifyToken(),
          })
        : undefined,
    },
  )
}

export async function sendWhatsAppText(input: {
  phoneNumberId: string
  to: string
  text: string
  replyToMessageId?: string | null
}) {
  const text = input.text.trim()
  if (!text || text.length > 4096) throw new Error('A mensagem deve ter entre 1 e 4096 caracteres.')

  const body: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: input.to,
    type: 'text',
    text: {
      body: text,
      preview_url: false,
    },
  }

  if (input.replyToMessageId) {
    body.context = { message_id: input.replyToMessageId }
  }

  const result = await metaRequest<SendMessageResponse>(
    `${encodeURIComponent(input.phoneNumberId)}/messages`,
    { method: 'POST', body: JSON.stringify(body) },
  )

  const messageId = result.messages?.[0]?.id
  if (!messageId) throw new Error('A Meta aceitou a requisição sem retornar um ID de mensagem.')

  return {
    messageId,
    waId: result.contacts?.[0]?.wa_id || input.to,
    rawStatus: result.messages?.[0]?.message_status || null,
  }
}
