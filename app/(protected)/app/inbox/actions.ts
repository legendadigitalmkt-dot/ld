'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { sendWhatsAppText } from '@/lib/meta/whatsapp'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { requireWorkspace } from '@/lib/workspace'

function fail(conversationId: string, message: string): never {
  redirect(`/app/inbox?conversation=${encodeURIComponent(conversationId)}&error=${encodeURIComponent(message)}`)
}

export async function sendInboxMessage(formData: FormData) {
  const [user, workspace] = await Promise.all([requireUser(), requireWorkspace()])
  const conversationId = String(formData.get('conversationId') || '').trim()
  const body = String(formData.get('body') || '').trim()

  if (!conversationId) redirect('/app/inbox?error=Conversa%20inválida.')
  if (workspace.role === 'viewer') fail(conversationId, 'Seu papel não permite enviar mensagens.')
  if (!body || body.length > 4096) fail(conversationId, 'A mensagem deve ter entre 1 e 4096 caracteres.')

  const supabase = await createClient()
  const { data: conversation, error: conversationError } = await supabase
    .from('conversations')
    .select('id,channel,external_thread_id,contact_id')
    .eq('id', conversationId)
    .eq('workspace_id', workspace.id)
    .maybeSingle()

  if (conversationError || !conversation) fail(conversationId, 'Conversa não encontrada.')
  if (conversation.channel !== 'whatsapp' || !conversation.external_thread_id) {
    fail(conversationId, 'Esta conversa não está conectada ao WhatsApp.')
  }

  const admin = createAdminClient()
  const { data: connection, error: connectionError } = await admin
    .from('integration_connections')
    .select('external_resource_id,status')
    .eq('workspace_id', workspace.id)
    .eq('provider', 'whatsapp_cloud')
    .maybeSingle()

  if (connectionError || !connection || connection.status !== 'connected' || !connection.external_resource_id) {
    fail(conversationId, 'Conecte o WhatsApp antes de enviar mensagens.')
  }

  let sent: Awaited<ReturnType<typeof sendWhatsAppText>>
  try {
    sent = await sendWhatsAppText({
      phoneNumberId: connection.external_resource_id,
      to: conversation.external_thread_id,
      text: body,
    })
  } catch (error) {
    await admin.from('activities').insert({
      workspace_id: workspace.id,
      actor_user_id: user.id,
      type: 'whatsapp_send_failed',
      text: 'Falha ao enviar mensagem pelo WhatsApp.',
      metadata: {
        conversation_id: conversationId,
        error: error instanceof Error ? error.message.slice(0, 500) : 'unknown',
      },
    })
    fail(conversationId, error instanceof Error ? error.message : 'Falha ao enviar mensagem.')
  }

  const now = new Date().toISOString()
  const { data: message, error: persistError } = await admin
    .from('messages')
    .insert({
      workspace_id: workspace.id,
      conversation_id: conversationId,
      direction: 'out',
      author_name: user.email || 'Equipe',
      body,
      external_message_id: sent.messageId,
      message_type: 'text',
      delivery_status: 'pending',
      status_updated_at: now,
      recipient_wa_id: sent.waId,
      sent_at: now,
      metadata: { meta_initial_status: sent.rawStatus },
    })
    .select('id')
    .single()

  if (persistError || !message) {
    throw new Error(`WhatsApp message sent but persistence failed: ${persistError?.message || 'unknown error'}`)
  }

  await admin.from('message_status_events').insert({
    workspace_id: workspace.id,
    message_id: message.id,
    external_message_id: sent.messageId,
    status: 'pending',
    occurred_at: now,
    recipient_wa_id: sent.waId,
    metadata: { source: 'send_api_response' },
  })

  await admin
    .from('conversations')
    .update({ last_message_at: now, status: 'open' })
    .eq('id', conversationId)
    .eq('workspace_id', workspace.id)

  await admin.from('activities').insert({
    workspace_id: workspace.id,
    actor_user_id: user.id,
    type: 'whatsapp_message_sent',
    text: 'Mensagem enviada pelo WhatsApp.',
    metadata: {
      conversation_id: conversationId,
      external_message_id: sent.messageId,
    },
  })

  revalidatePath('/app/inbox')
  redirect(`/app/inbox?conversation=${encodeURIComponent(conversationId)}`)
}
