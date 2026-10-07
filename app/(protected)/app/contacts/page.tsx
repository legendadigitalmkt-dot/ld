import { createClient } from '@/lib/supabase/server'
import { requireWorkspace } from '@/lib/workspace'
import { createContact } from './actions'

export default async function ContactsPage() {
  const workspace = await requireWorkspace()
  const supabase = await createClient()
  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('id,name,phone,email,source,status,tags,last_interaction_at,created_at')
    .eq('workspace_id', workspace.id)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw new Error(`Failed to load contacts: ${error.message}`)

  return (
    <>
      <div className="section-head"><div><div className="brand">CRM</div><h1 style={{ marginTop: 8 }}>Contatos</h1></div></div>
      <form action={createContact} className="card inline-form" style={{ marginBottom: 16 }}>
        <label>Nome<input name="name" required placeholder="Nome do lead" /></label>
        <label>Telefone<input name="phone" placeholder="+55..." /></label>
        <label>Origem<select name="source" defaultValue="Manual"><option>Manual</option><option>WhatsApp</option><option>Instagram</option><option>Meta Ads</option><option>Google</option><option>Indicação</option></select></label>
        <button className="button" type="submit">Adicionar</button>
      </form>
      <section className="card table-wrap">
        <table><thead><tr><th>Contato</th><th>Origem</th><th>Status</th><th>Última interação</th></tr></thead><tbody>
          {(contacts || []).map((contact) => <tr key={contact.id}><td><strong>{contact.name}</strong><br/><span className="muted">{contact.phone || contact.email || '—'}</span></td><td>{contact.source || '—'}</td><td><span className="badge">{contact.status}</span></td><td>{contact.last_interaction_at ? new Date(contact.last_interaction_at).toLocaleString('pt-BR') : '—'}</td></tr>)}
        </tbody></table>
      </section>
    </>
  )
}
