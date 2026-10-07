import { createClient } from '@/lib/supabase/server'
import { isWorkspaceAdmin, requireWorkspace } from '@/lib/workspace'

export default async function MembersPage() {
  const workspace = await requireWorkspace()
  const supabase = await createClient()
  const { data: members, error } = await supabase
    .from('workspace_members')
    .select('id,role,created_at,user_id,profile:profiles(full_name,avatar_url)')
    .eq('workspace_id', workspace.id)
    .order('created_at')
  if (error) throw new Error(`Failed to load members: ${error.message}`)
  return <><div className="section-head"><div><div className="brand">ACCESS</div><h1 style={{marginTop:8}}>Equipe</h1><p className="muted">Seu papel: {workspace.role}. {isWorkspaceAdmin(workspace.role) ? 'Administração de membros será habilitada via fluxo de convite server-side.' : 'Somente owners/admins podem administrar membros.'}</p></div></div><section className="card table-wrap"><table><thead><tr><th>Membro</th><th>Papel</th><th>Desde</th></tr></thead><tbody>{(members || []).map((member)=>{ const profile=Array.isArray(member.profile)?member.profile[0]:member.profile; return <tr key={member.id}><td>{profile?.full_name || member.user_id}</td><td><span className="badge">{member.role}</span></td><td>{new Date(member.created_at).toLocaleDateString('pt-BR')}</td></tr>})}</tbody></table></section></>
}
