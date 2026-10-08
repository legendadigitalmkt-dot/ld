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
    const code = meta.error?.code
    const subcode = meta.error?.error_subcode
    const suffix = [
      typeof code === 'number' ? `code ${code}` : null,
      typeof subcode === 'number' ? `subcode ${subcode}` : null,
      meta.error?.fbtrace_id ? `fbtrace ${meta.error.fbtrace_id}` : null,
    ].filter(Boolean).join(', ')
    throw new Error(suffix ? `${message} [${suffix}]` : message)
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

export type MetaDiagnosticResult = {
  operation:
    | 'token_identity'
    | 'token_permissions'
    | 'visible_businesses'
    | 'assigned_wabas'
    | 'phone'
    | 'waba'
    | 'waba_phone_numbers'
  ok: boolean
  summary: string
}

async function diagnoseMetaOperation(
  operation: MetaDiagnosticResult['operation'],
  request: () => Promise<unknown>,
  summarize?: (payload: unknown) => string,
): Promise<MetaDiagnosticResult> {
  try {
    const payload = await request()
    if (summarize) {
      return { operation, ok: true, summary: summarize(payload) }
    }

    const record = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {}
    const data = Array.isArray(record.data) ? record.data : null
    const id = typeof record.id === 'string' ? record.id : null
    return {
      operation,
      ok: true,
      summary: data ? `OK — ${data.length} recurso(s) retornado(s).` : id ? `OK — objeto ${id} acessível.` : 'OK — recurso acessível.',
    }
  } catch (error) {
    return {
      operation,
      ok: false,
      summary: error instanceof Error ? error.message : 'Falha desconhecida da Meta.',
    }
  }
}

function summarizeIdentity(payload: unknown) {
  const record = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {}
  const id = typeof record.id === 'string' ? record.id : 'desconhecido'
  const name = typeof record.name === 'string' ? record.name : null
  return name ? `OK — identidade ${name} (ID ${id}).` : `OK — identidade ID ${id}.`
}

function summarizePermissionList(payload: unknown) {
  const record = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {}
  const data = Array.isArray(record.data) ? record.data : []
  const granted = data
    .filter((item) => item && typeof item === 'object' && (item as Record<string, unknown>).status === 'granted')
    .map((item) => (item as Record<string, unknown>).permission)
    .filter((permission): permission is string => typeof permission === 'string')
    .sort()

  return granted.length
    ? `OK — permissões concedidas: ${granted.join(', ')}.`
    : 'OK — a Meta não retornou permissões com status granted.'
}

function summarizeResourceList(payload: unknown, label: string) {
  const record = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {}
  const data = Array.isArray(record.data) ? record.data : []
  const resources = data
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const resource = item as Record<string, unknown>
      const id = typeof resource.id === 'string' ? resource.id : null
      const name = typeof resource.name === 'string' ? resource.name : null
      return id ? (name ? `${name} (${id})` : id) : null
    })
    .filter((item): item is string => Boolean(item))

  return resources.length
    ? `OK — ${label}: ${resources.join(', ')}.`
    : `OK — nenhuma ${label.toLowerCase()} retornada.`
}

export async function diagnoseWhatsAppMetaAssets(wabaId: string, phoneNumberId: string) {
  return Promise.all([
    diagnoseMetaOperation(
      'token_identity',
      () => metaRequest('me?fields=id,name'),
      summarizeIdentity,
    ),
    diagnoseMetaOperation(
      'token_permissions',
      () => metaRequest('me/permissions'),
      summarizePermissionList,
    ),
    diagnoseMetaOperation(
      'visible_businesses',
      () => metaRequest('me/businesses?fields=id,name'),
      (payload) => summarizeResourceList(payload, 'negócios visíveis'),
    ),
    diagnoseMetaOperation(
      'assigned_wabas',
      () => metaRequest('me/assigned_whatsapp_business_accounts?fields=id,name'),
      (payload) => summarizeResourceList(payload, 'WABAs atribuídas'),
    ),
    diagnoseMetaOperation('phone', () =>
      metaRequest(`${encodeURIComponent(phoneNumberId)}?fields=id,display_phone_number,verified_name,quality_rating`),
    ),
    diagnoseMetaOperation('waba', () =>
      metaRequest(`${encodeURIComponent(wabaId)}?fields=id,name`),
    ),
    diagnoseMetaOperation('waba_phone_numbers', () =>
      metaRequest(`${encodeURIComponent(wabaId)}/phone_numbers?fields=id,display_phone_number`),
    ),
  ])
}

export async function getWhatsAppPhoneNumber(phoneNumberId: string) {
  return metaRequest<WhatsAppPhoneNumber>(
    `${encodeURIComponent(phoneNumberId)}?fields=id,display_phone_number,verified_name,quality_rating`,
  )
}

export async function getWhatsAppBusinessPhoneNumbers(wabaId: string) {
  try {
    const result = await metaRequest<{ data?: WhatsAppPhoneNumber[] }>(
      `${encodeURIComponent(wabaId)}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating`,
    )
    return result.data || []
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha desconhecida da Meta.'
    if (message.includes('nonexisting field (phone_numbers)')) {
      throw new Error(
        'A Meta não reconheceu o ID informado como uma WhatsApp Business Account (WABA). ' +
        'Confirme o WABA ID em Meta for Developers > WhatsApp > Configuração da API; ' +
        'não use o ID do portfólio empresarial nem o Phone Number ID. Detalhe da Meta: ' +
        message,
      )
    }
    throw error
  }
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
