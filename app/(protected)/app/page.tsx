import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireWorkspace } from '@/lib/workspace'

function money(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)
}

export default async function DashboardPage() {
  const workspace = await requireWorkspace()
  const supabase = await createClient()
  const [contactsResult, dealsResult, tasksResult] = await Promise.all([
    supabase.from('contacts').select('id,status').eq('workspace_id', workspace.id),
    supabase.from('deals').select('id,stage,value,last_activity_at,updated_at').eq('workspace_id', workspace.id),
    supabase.from('tasks').select('id,status').eq('workspace_id', workspace.id),
  ])

  const error = contactsResult.error || dealsResult.error || tasksResult.error
  if (error) throw new Error(`Dashboard query failed: ${error.message}`)

  const contacts = contactsResult.data || []
  const deals = dealsResult.data || []
  const tasks = tasksResult.data || []
  const open = deals.filter((deal) => !['won', 'lost'].includes(deal.stage))
  const won = deals.filter((deal) => deal.stage === 'won')
  const pipeline = open.reduce((sum, deal) => sum + Number(deal.value || 0), 0)
  const revenue = won.reduce((sum, deal) => sum + Number(deal.value || 0), 0)
  const now = Date.now()
  const idle = open.filter((deal) => now - new Date(deal.last_activity_at || deal.updated_at).getTime() >= 24 * 60 * 60 * 1000)
  const risk = idle.reduce((sum, deal) => sum + Number(deal.value || 0), 0)

  return (
    <>
      <div className="section-head">
        <div><div className="brand">OVERVIEW</div><h1 style={{ marginTop: 8 }}>Operação comercial</h1></div>
        <Link className="button" href="/app/contacts">Novo lead</Link>
      </div>
      <div className="grid metrics">
        <article className="card metric"><span>Leads ativos</span><strong>{contacts.filter((c) => c.status === 'lead').length}</strong></article>
        <article className="card metric"><span>Pipeline aberto</span><strong>{money(pipeline)}</strong></article>
        <article className="card metric"><span>Receita ganha</span><strong>{money(revenue)}</strong></article>
        <article className="card metric"><span>Valor em risco</span><strong>{money(risk)}</strong><small className="muted">{idle.length} follow-ups</small></article>
      </div>
      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', marginTop: 16 }}>
        <article className="card"><h2>Próxima ação</h2><p className="muted">O foco da V1 continua sendo transformar leads em ações comerciais rastreáveis.</p><Link href="/app/pipeline" className="button secondary">Abrir pipeline</Link></article>
        <article className="card"><h2>Tarefas abertas</h2><p style={{ fontSize: 34, marginBottom: 0 }}>{tasks.filter((t) => t.status === 'open').length}</p></article>
      </div>
    </>
  )
}
