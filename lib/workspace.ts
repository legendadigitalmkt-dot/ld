import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth'

export type WorkspaceRole = 'owner' | 'admin' | 'sales' | 'support' | 'viewer'

export type CurrentWorkspace = {
  id: string
  name: string
  slug: string
  segment: string | null
  timezone: string
  role: WorkspaceRole
}

export async function getCurrentWorkspace(): Promise<CurrentWorkspace | null> {
  const user = await requireUser()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('workspace_members')
    .select('role, workspace:workspaces!inner(id,name,slug,segment,timezone)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`Failed to load workspace: ${error.message}`)
  if (!data?.workspace) return null

  const workspace = Array.isArray(data.workspace) ? data.workspace[0] : data.workspace
  if (!workspace) return null

  return {
    id: String(workspace.id),
    name: String(workspace.name),
    slug: String(workspace.slug),
    segment: workspace.segment ? String(workspace.segment) : null,
    timezone: String(workspace.timezone),
    role: data.role as WorkspaceRole,
  }
}

export async function requireWorkspace(): Promise<CurrentWorkspace> {
  const workspace = await getCurrentWorkspace()
  if (!workspace) redirect('/onboarding')
  return workspace
}

export function isWorkspaceAdmin(role: WorkspaceRole) {
  return role === 'owner' || role === 'admin'
}
