import { createClient } from '@/lib/supabase/server'
import { isWorkspaceAdmin, requireWorkspace } from '@/lib/workspace'
import { inviteMember } from './actions'

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const workspace = await requireWorkspace()
  const params = await searchParams
  const errorMessage = typeof params.error === 'string' ? params.error : null
  const message = typeof params.message === 'string' ? params.message : null

  const supabase = await createClient()
  const { data: members, error } = await supabase
    .from('workspace_members')
    .select('id,role,created_at,user_id,profile:profiles(full_name,avatar_url)')
    .eq('workspace_id', workspace.id)
    .order('created_at')

  if (error) throw new Error(`Failed to load members: ${error.message}`)

  return (
    <>
      <div className="section-head">
        <div>
          <div className="brand">ACCESS</div>
          <h1 style={{ marginTop: 8 }}>Equipe</h1>
          <p className="muted">Seu papel: {workspace.role}. Memberships só são alteradas por ações server-side autorizadas.</p>
        </div>
      </div>

      {errorMessage ? <p className="error">{errorMessage}</p> : null}
      {message ? <p className="card">{message}</p> : null}

      {isWorkspaceAdmin(workspace.role) ? (
        <form action={inviteMember} className="card inline-form" style={{ marginBottom: 16 }}>
          <label>
            E-mail
            <input name="email" required type="email" placeholder="pessoa@empresa.com" />
          </label>
          <label>
            Papel
            <select name="role" defaultValue="sales">
              {workspace.role === 'owner' ? <option value="owner">Owner</option> : null}
              <option value="admin">Admin</option>
              <option value="sales">Sales</option>
              <option value="support">Support</option>
              <option value="viewer">Viewer</option>
            </select>
          </label>
          <div />
          <button className="button">Convidar</button>
        </form>
      ) : null}

      <section className="card table-wrap">
        <table>
          <thead><tr><th>Membro</th><th>Papel</th><th>Desde</th></tr></thead>
          <tbody>
            {(members || []).map((member) => {
              const profile = Array.isArray(member.profile) ? member.profile[0] : member.profile
              return (
                <tr key={member.id}>
                  <td>{profile?.full_name || member.user_id}</td>
                  <td><span className="badge">{member.role}</span></td>
                  <td>{new Date(member.created_at).toLocaleDateString('pt-BR')}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </>
  )
}
