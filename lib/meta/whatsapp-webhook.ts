import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

type UnknownRecord = Record<string, unknown>

type MetaChange = {
  field?: string
  value?: UnknownRecord
}

type MetaEntry = {
  id?: string
  changes?: MetaChange[]
}

export type WhatsAppWebhookPayload = {
  object?: string
  entry?: MetaEntry[]
}

type ProcessingCounts = {
  inbound: number
  statuses: number
  newLeads: number
}

const DELIVERY_RANK: Record<string, number> = {
  pending: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 99,
  deleted: 99,
}

function record(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : {}
}

function records(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? value.map(record) : []
}

function string(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function timestamp(value: unknown) {
  const seconds = Number(value)
  return Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000).toISOString() : new Date().toISOString()
}

function messageBody(message: UnknownRecord) {
  const type = string(message.type) || 'unknown'

  if (type === 'text') return string(record(message.text).body) || '[Texto vazio]'
  if (type === 'button') return string(record(message.button).text) || '[Botão]'
  if (type === 'interactive') {
    const interactive = record(message.interactive)
    const buttonReply = record(interactive.button_reply)
    const listReply = record(interactive.list_reply)
    return string(buttonReply.title) || string(listReply.title) || '[Interação]'
  }
  if (type === 'image') return string(record(message.image).caption) || '[Imagem]'
  if (type === 'video') return string(record(message.video).caption) || '[Vídeo]'
  if (type === 'document') {
    const document = record(message.document)
    return string(document.caption) || string(document.filename) || '[Documento]'
  }
  if (type === 'audio') return '[Áudio]'
  if (type === 'sticker') return '[Sticker]'
  if (type === 'contacts') return '[Contato]'
  if (type === 'location') {
    const location = record(message.location)
    const latitude = location.latitude
    const longitude = location.longitude
    return latitude != null && longitude != null ? `[Localização: ${latitude}, ${longitude}]` : '[Localização]'
  }
  if (type === 'reaction') return string(record(message.reaction).emoji) || '[Reação]'

  return `[${type}]`
}

function messageMetadata(message: UnknownRecord) {
  const type = string(message.type) || 'unknown'
  const media = record(message[type])
  const context = record(message.context)

  return {
    media_id: string(media.id) || null,
    mime_type: string(media.mime_type) || null,
    filename: string(media.filename) || null,
    context_message_id: string(context.id) || null,
  }
}

async function ensureContact(input: {
  workspaceId: string
  waId: string
  profileName: string
  interactedAt: string
}) {
  const admin = createAdminClient()

  const { data: channel, error: channelError } = await admin
    .from('contact_channels')
    .select('contact_id')
    .eq('workspace_id', input.workspaceId)
    .eq('channel', 'whatsapp')
    .eq('external_id', input.waId)
    .maybeSingle()

  if (channelError) throw new Error(`Failed to resolve WhatsApp contact channel: ${channelError.message}`)

  if (channel?.contact_id) {
    await admin
      .from('contacts')
      .update({ last_interaction_at: input.interactedAt })
      .eq('id', channel.contact_id)
      .eq('workspace_id', input.workspaceId)
    return { contactId: channel.contact_id, created: false }
  }

  const normalizedPhone = `+${input.waId.replace(/\D/g, '')}`
  const { data: phoneMatch } = await admin
    .from('contacts')
    .select('id')
    .eq('workspace_id', input.workspaceId)
    .eq('phone', normalizedPhone)
    .limit(1)
    .maybeSingle()

  let contactId = phoneMatch?.id as string | undefined
  let created = false

  if (!contactId) {
    const fallbackName = `WhatsApp ${input.waId.slice(-4)}`
    const { data: contact, error } = await admin
      .from('contacts')
      .insert({
        workspace_id: input.workspaceId,
        name: input.profileName || fallbackName,
        phone: normalizedPhone,
        source: 'WhatsApp',
        status: 'lead',
        tags: ['whatsapp'],
        last_interaction_at: input.interactedAt,
      })
      .select('id')
      .single()

    if (error || !contact) throw new Error(`Failed to create WhatsApp lead: ${error?.message || 'unknown error'}`)
    contactId = contact.id
    created = true
  } else {
    await admin
      .from('contacts')
      .update({ last_interaction_at: input.interactedAt })
      .eq('id', contactId)
      .eq('workspace_id', input.workspaceId)
  }

  const { error: channelInsertError } = await admin.from('contact_channels').insert({
    workspace_id: input.workspaceId,
    contact_id: contactId,
    channel: 'whatsapp',
    external_id: input.waId,
    display_value: normalizedPhone,
  })

  if (channelInsertError) {
    if (channelInsertError.code === '23505') {
      if (created) {
        await admin.from('contacts').delete().eq('id', contactId).eq('workspace_id', input.workspaceId)
      }
      const { data: existing } = await admin
        .from('contact_channels')
        .select('contact_id')
        .eq('workspace_id', input.workspaceId)
        .eq('channel', 'whatsapp')
        .eq('external_id', input.waId)
        .single()
      if (!existing?.contact_id) throw new Error('WhatsApp contact channel raced and could not be recovered.')
      return { contactId: existing.contact_id, created: false }
    }
    throw new Error(`Failed to map WhatsApp channel: ${channelInsertError.message}`)
  }

  if (created) {
    await admin.from('deals').insert({
      workspace_id: input.workspaceId,
      contact_id: contactId,
      title: `WhatsApp — ${input.profileName || normalizedPhone}`,
      stage: 'new',
      value: 0,
      probability: 20,
      last_activity_at: input.interactedAt,
    })

    await admin.from('activities').insert({
      workspace_id: input.workspaceId,
      type: 'whatsapp_lead_created',
      text: `Novo lead criado pelo WhatsApp: ${input.profileName || normalizedPhone}`,
      metadata: { contact_id: contactId, wa_id: input.waId },
    })
  }

  return { contactId, created }
}

async function ensureConversation(input: {
  workspaceId: string
  contactId: string
  waId: string
  lastMessageAt: string
}) {
  const admin = createAdminClient()
  const { data: existing, error } = await admin
    .from('conversations')
    .select('id,unread_count')
    .eq('workspace_id', input.workspaceId)
    .eq('channel', 'whatsapp')
    .eq('external_thread_id', input.waId)
    .maybeSingle()

  if (error) throw new Error(`Failed to resolve WhatsApp conversation: ${error.message}`)
  if (existing) return existing

  const { data: created, error: createError } = await admin
    .from('conversations')
    .insert({
      workspace_id: input.workspaceId,
      contact_id: input.contactId,
      channel: 'whatsapp',
      external_thread_id: input.waId,
      status: 'open',
      unread_count: 0,
      last_message_at: input.lastMessageAt,
    })
    .select('id,unread_count')
    .single()

  if (createError) {
    if (createError.code === '23505') {
      const { data: raced } = await admin
        .from('conversations')
        .select('id,unread_count')
        .eq('workspace_id', input.workspaceId)
        .eq('channel', 'whatsapp')
        .eq('external_thread_id', input.waId)
        .single()
      if (raced) return raced
    }
    throw new Error(`Failed to create WhatsApp conversation: ${createError.message}`)
  }

  return created
}

async function processInboundMessage(input: {
  workspaceId: string
  value: UnknownRecord
  message: UnknownRecord
}) {
  const admin = createAdminClient()
  const waId = string(input.message.from)
  const externalMessageId = string(input.message.id)
  if (!waId || !externalMessageId) return { inserted: false, newLead: false }

  const sentAt = timestamp(input.message.timestamp)
  const contacts = records(input.value.contacts)
  const contactPayload = contacts.find((item) => string(item.wa_id) === waId) || contacts[0] || {}
  const profileName = string(record(contactPayload.profile).name)

  const contact = await ensureContact({
    workspaceId: input.workspaceId,
    waId,
    profileName,
    interactedAt: sentAt,
  })

  const conversation = await ensureConversation({
    workspaceId: input.workspaceId,
    contactId: contact.contactId,
    waId,
    lastMessageAt: sentAt,
  })

  const { data: existing } = await admin
    .from('messages')
    .select('id')
    .eq('workspace_id', input.workspaceId)
    .eq('external_message_id', externalMessageId)
    .maybeSingle()

  if (existing) return { inserted: false, newLead: contact.created }

  const type = string(input.message.type) || 'unknown'
  const context = record(input.message.context)
  const { error: messageError } = await admin.from('messages').insert({
    workspace_id: input.workspaceId,
    conversation_id: conversation.id,
    direction: 'in',
    author_name: profileName || waId,
    body: messageBody(input.message),
    external_message_id: externalMessageId,
    message_type: type,
    sender_wa_id: waId,
    reply_to_external_message_id: string(context.id) || null,
    metadata: messageMetadata(input.message),
    sent_at: sentAt,
  })

  if (messageError) {
    if (messageError.code === '23505') return { inserted: false, newLead: contact.created }
    throw new Error(`Failed to persist inbound WhatsApp message: ${messageError.message}`)
  }

  await admin
    .from('conversations')
    .update({
      unread_count: Number(conversation.unread_count || 0) + 1,
      last_message_at: sentAt,
      status: 'open',
    })
    .eq('id', conversation.id)
    .eq('workspace_id', input.workspaceId)

  await admin.from('contacts').update({ last_interaction_at: sentAt }).eq('id', contact.contactId)

  await admin.from('activities').insert({
    workspace_id: input.workspaceId,
    type: 'whatsapp_message_received',
    text: `Mensagem recebida no WhatsApp de ${profileName || waId}`,
    metadata: {
      contact_id: contact.contactId,
      conversation_id: conversation.id,
      external_message_id: externalMessageId,
    },
  })

  return { inserted: true, newLead: contact.created }
}

function statusError(status: UnknownRecord) {
  const error = records(status.errors)[0] || {}
  return {
    code: error.code != null ? String(error.code) : null,
    message: [string(error.title) || string(error.message), string(record(error.error_data).details)].filter(Boolean).join(' — ').slice(0, 1000) || null,
  }
}

async function processStatus(input: {
  workspaceId: string
  status: UnknownRecord
}) {
  const admin = createAdminClient()
  const externalMessageId = string(input.status.id)
  const nextStatus = string(input.status.status)
  if (!externalMessageId || !(nextStatus in DELIVERY_RANK)) return false

  const { data: message, error } = await admin
    .from('messages')
    .select('id,delivery_status')
    .eq('workspace_id', input.workspaceId)
    .eq('external_message_id', externalMessageId)
    .maybeSingle()

  if (error) throw new Error(`Failed to resolve message status target: ${error.message}`)
  if (!message) return false

  const occurredAt = timestamp(input.status.timestamp)
  const recipientWaId = string(input.status.recipient_id) || null
  const failure = statusError(input.status)

  const { error: statusInsertError } = await admin.from('message_status_events').insert({
    workspace_id: input.workspaceId,
    message_id: message.id,
    external_message_id: externalMessageId,
    status: nextStatus,
    occurred_at: occurredAt,
    recipient_wa_id: recipientWaId,
    error_code: failure.code,
    error_message: failure.message,
    metadata: {
      conversation: record(input.status.conversation),
      pricing: record(input.status.pricing),
    },
  })

  if (statusInsertError && statusInsertError.code !== '23505') {
    throw new Error(`Failed to persist message status history: ${statusInsertError.message}`)
  }

  const current = string(message.delivery_status)
  const shouldAdvance =
    !current ||
    DELIVERY_RANK[nextStatus] >= (DELIVERY_RANK[current] ?? -1) ||
    nextStatus === 'failed' ||
    nextStatus === 'deleted'

  if (shouldAdvance) {
    const { error: updateError } = await admin
      .from('messages')
      .update({
        delivery_status: nextStatus,
        status_updated_at: occurredAt,
        error_code: failure.code,
        error_message: failure.message,
      })
      .eq('id', message.id)
      .eq('workspace_id', input.workspaceId)

    if (updateError) throw new Error(`Failed to update message delivery status: ${updateError.message}`)
  }

  return true
}

export async function processWhatsAppWebhook(input: {
  payload: WhatsAppWebhookPayload
  eventKey: string
  payloadHash: string
}) {
  const admin = createAdminClient()
  const entries = input.payload.entry || []
  const changes = entries.flatMap((entry) => entry.changes || [])
  const firstValue = record(changes[0]?.value)
  const metadata = record(firstValue.metadata)
  const phoneNumberId = string(metadata.phone_number_id)
  const wabaId = string(entries[0]?.id)

  const messageCount = changes.reduce((sum, change) => sum + records(record(change.value).messages).length, 0)
  const statusCount = changes.reduce((sum, change) => sum + records(record(change.value).statuses).length, 0)
  const eventType = [messageCount ? 'messages' : '', statusCount ? 'statuses' : ''].filter(Boolean).join('+') || string(changes[0]?.field) || 'unknown'

  const { data: connection } = phoneNumberId
    ? await admin
        .from('integration_connections')
        .select('id,workspace_id,status')
        .eq('provider', 'whatsapp_cloud')
        .eq('external_resource_id', phoneNumberId)
        .maybeSingle()
    : { data: null }

  const workspaceId = connection?.workspace_id || null

  const { data: existingEvent } = await admin
    .from('webhook_events')
    .select('id,processing_status')
    .eq('provider', 'meta_whatsapp')
    .eq('event_key', input.eventKey)
    .maybeSingle()

  if (existingEvent?.processing_status === 'processed' || existingEvent?.processing_status === 'ignored') {
    return { duplicate: true, counts: { inbound: 0, statuses: 0, newLeads: 0 } }
  }

  let eventId = existingEvent?.id as string | undefined

  if (!eventId) {
    const { data: event, error } = await admin
      .from('webhook_events')
      .insert({
        provider: 'meta_whatsapp',
        event_key: input.eventKey,
        workspace_id: workspaceId,
        external_resource_id: phoneNumberId || null,
        event_type: eventType,
        payload_hash: input.payloadHash,
        processing_status: workspaceId ? 'processing' : 'ignored',
        processed_at: workspaceId ? null : new Date().toISOString(),
        metadata: {
          waba_id: wabaId || null,
          message_count: messageCount,
          status_count: statusCount,
        },
      })
      .select('id')
      .single()

    if (error) {
      if (error.code === '23505') return { duplicate: true, counts: { inbound: 0, statuses: 0, newLeads: 0 } }
      throw new Error(`Failed to persist webhook idempotency record: ${error.message}`)
    }
    eventId = event.id
  } else {
    await admin
      .from('webhook_events')
      .update({
        processing_status: workspaceId ? 'processing' : 'ignored',
        workspace_id: workspaceId,
        error_message: null,
      })
      .eq('id', eventId)
  }

  if (!workspaceId || connection?.status !== 'connected') {
    if (eventId) {
      await admin
        .from('webhook_events')
        .update({
          processing_status: 'ignored',
          processed_at: new Date().toISOString(),
          error_message: phoneNumberId ? 'WhatsApp phone number is not connected to a workspace.' : 'Missing phone_number_id.',
        })
        .eq('id', eventId)
    }
    return { duplicate: false, counts: { inbound: 0, statuses: 0, newLeads: 0 } }
  }

  const counts: ProcessingCounts = { inbound: 0, statuses: 0, newLeads: 0 }

  try {
    for (const change of changes) {
      if (change.field !== 'messages') continue
      const value = record(change.value)

      for (const message of records(value.messages)) {
        const result = await processInboundMessage({ workspaceId, value, message })
        if (result.inserted) counts.inbound += 1
        if (result.newLead) counts.newLeads += 1
      }

      for (const status of records(value.statuses)) {
        if (await processStatus({ workspaceId, status })) counts.statuses += 1
      }
    }

    await admin
      .from('webhook_events')
      .update({
        processing_status: 'processed',
        processed_at: new Date().toISOString(),
        metadata: {
          waba_id: wabaId || null,
          message_count: messageCount,
          status_count: statusCount,
          processed_inbound: counts.inbound,
          processed_statuses: counts.statuses,
          new_leads: counts.newLeads,
        },
      })
      .eq('id', eventId)

    return { duplicate: false, counts }
  } catch (error) {
    await admin
      .from('webhook_events')
      .update({
        processing_status: 'failed',
        processed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message.slice(0, 1000) : 'Unknown webhook processing failure',
      })
      .eq('id', eventId)

    throw error
  }
}
