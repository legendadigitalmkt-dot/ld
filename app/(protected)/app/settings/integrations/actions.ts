'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import {
  getWhatsAppBusinessPhoneNumbers,
  type WhatsAppPhoneNumber,
  getWhatsAppWebhookUrl,
  subscribeWhatsAppBusinessAccount,
} from '@/lib/meta/whatsapp'
import { createAdminClient } from '@/lib/supabase/admin'
import { isWorkspaceAdmin, requireWorkspace } from '@/lib/workspace'

function fail(message: string): never {
  redirect(`/app/settings/integrations?error=${encodeURIComponent(message)}`)
}

export async function connectWhatsApp(formData: FormData) {
  const [user, workspace] = await Promise.all([requireUser(), requireWorkspace()])
  if (!isWorkspaceAdmin(workspace.role)) fail('Somente owners e admins podem conectar o WhatsApp.')

  const wabaId = String(formData.get('wabaId') || '').trim()
  const phoneNumberId = String(formData.get('phoneNumberId') || '').trim()

  if (!/^\d+$/.test(wabaId) || !/^\d+$/.test(phoneNumberId)) {
    fail('Informe WABA ID e Phone Number ID válidos.')
  }

  let phone: WhatsAppPhoneNumber | undefined
  try {
    const phones = await getWhatsAppBusinessPhoneNumbers(wabaId)
    phone = phones.find((item) => item.id === phoneNumberId)
    if (!phone) fail('O Phone Number ID não pertence ao WABA informado ou o token não possui acesso.')

    await subscribeWhatsAppBusinessAccount(wabaId)
  } catch (error) {
    fail(error instanceof Error ? error.message : 'Não foi possível validar a conta na Meta.')
  }

  const admin = createAdminClient()
  const { data: existing, error: existingError } = await admin
    .from('integration_connections')
    .select('id')
    .eq('workspace_id', workspace.id)
    .eq('provider', 'whatsapp_cloud')
    .maybeSingle()

  if (existingError) fail(existingError.message)

  const connectionData = {
    workspace_id: workspace.id,
    provider: 'whatsapp_cloud',
    external_account_id: wabaId,
    external_resource_id: phoneNumberId,
    status: 'connected',
    connected_at: new Date().toISOString(),
    last_error: null,
    metadata: {
      display_phone_number: phone?.display_phone_number || null,
      verified_name: phone?.verified_name || null,
      quality_rating: phone?.quality_rating || null,
      webhook_url: getWhatsAppWebhookUrl(),
    },
  }

  const result = existing?.id
    ? await admin.from('integration_connections').update(connectionData).eq('id', existing.id)
    : await admin.from('integration_connections').insert(connectionData)

  if (result.error) {
    if (result.error.code === '23505') fail('Este número de WhatsApp já está conectado a outro workspace.')
    fail(result.error.message)
  }

  await admin.from('activities').insert({
    workspace_id: workspace.id,
    actor_user_id: user.id,
    type: 'whatsapp_connected',
    text: `WhatsApp Cloud API conectado: ${phone?.display_phone_number || phoneNumberId}`,
    metadata: {
      waba_id: wabaId,
      phone_number_id: phoneNumberId,
      verified_name: phone?.verified_name || null,
    },
  })

  revalidatePath('/app/settings/integrations')
  redirect(`/app/settings/integrations?message=${encodeURIComponent('WhatsApp conectado e WABA inscrito no webhook.')}`)
}
