'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getAppUrl } from '@/lib/env'
import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { isWorkspaceAdmin, requireWorkspace, type WorkspaceRole } from '@/lib/workspace'

const allowedRoles: WorkspaceRole[] = ['owner', 'admin', 'sales', 'support', 'viewer']

function fail(message: string): never {
  redirect(`/app/settings/members?error=${encodeURIComponent(message)}`)
}

export async function inviteMember(formData: FormData) {
  const [user, workspace] = await Promise.all([requireUser(), requireWorkspace()])
  if (!isWorkspaceAdmin(workspace.role)) fail('Somente owners e admins podem convidar membros.')

  const email = String(formData.get('email') || '').trim().toLowerCase()
  const role = String(formData.get('role') || 'viewer') as WorkspaceRole

  if (!email?.includes('@')) fail('Informe um e-mail válido.')
  if (!allowedRoles.includes(role)) fail('Papel inválido.')
  if (role === 'owner' && workspace.role !== 'owner') fail('Somente um owner pode convidar outro owner.')

  const admin = createAdminClient()

  const { data: invitation, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${getAppUrl()}/auth/callback?next=/app`,
  })

  if (inviteError || !invitation.user) {
    fail(inviteError?.message || 'Não foi possível criar o convite.')
  }

  const { error: membershipError } = await admin.from('workspace_members').upsert(
    {
      workspace_id: workspace.id,
      user_id: invitation.user.id,
      role,
    },
    { onConflict: 'workspace_id,user_id', ignoreDuplicates: false },
  )

  if (membershipError) fail('O usuário foi convidado, mas não foi possível vinculá-lo ao workspace.')

  await admin.from('activities').insert({
    workspace_id: workspace.id,
    actor_user_id: user.id,
    type: 'member_invited',
    text: `Convite enviado para ${email} como ${role}`,
    metadata: { invited_email: email, role },
  })

  revalidatePath('/app/settings/members')
  redirect(`/app/settings/members?message=${encodeURIComponent('Convite enviado.')}`)
}
