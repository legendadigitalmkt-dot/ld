'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentWorkspace } from '@/lib/workspace'

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60)
}

export async function createWorkspace(formData: FormData) {
  const existing = await getCurrentWorkspace()
  if (existing) redirect('/app')

  const user = await requireUser()
  const name = String(formData.get('name') || '').trim().slice(0, 120)
  const segment = String(formData.get('segment') || '').trim().slice(0, 120) || null
  if (name.length < 2) redirect('/onboarding?error=Informe%20o%20nome%20da%20empresa.')

  const admin = createAdminClient()
  const baseSlug = slugify(name) || 'workspace'
  const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 6)}`
  const { data: workspace, error: workspaceError } = await admin
    .from('workspaces')
    .insert({ name, slug, segment })
    .select('id')
    .single()

  if (workspaceError || !workspace) redirect(`/onboarding?error=${encodeURIComponent(workspaceError?.message || 'Falha ao criar workspace.')}`)

  const { error: membershipError } = await admin.from('workspace_members').insert({
    workspace_id: workspace.id,
    user_id: user.id,
    role: 'owner',
  })

  if (membershipError) {
    await admin.from('workspaces').delete().eq('id', workspace.id)
    redirect(`/onboarding?error=${encodeURIComponent('Falha ao vincular o proprietário ao workspace.')}`)
  }

  revalidatePath('/app')
  redirect('/app')
}
