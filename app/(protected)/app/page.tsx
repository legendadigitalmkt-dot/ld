import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireWorkspace } from '@/lib/workspace'

function money(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value)
}

export default async function DashboardPage() {
  const workspace = await requireWorkspace()
  const supabase = await createClient()

  const [contactsResult, dealsResult, tasksResult] = await Promise.all([
    supabase.from('contacts').select('id,status').eq('workspace_id', workspace.id),
    supabase
      .from('deals')
      .select('id,stage,value,last_activity_at,updated_at')
      .eq('workspace_id', workspace.id),
    supabase.from('tasks').select('id,status').eq('workspace_id', workspace.id),
  ])

  const error = contactsResult.error || dealsResult.error || tasksResult.error
  if (error) throw new Error(`Dashboard query failed: ${error.message}`)

  const contacts = contactsResult.data || []
  const deals = dealsResult.data || []
  const tasks = tasksResult.data || []

  const open = deals.filter((deal) => !['won', 'lost'].includes(deal.stage))
  const won = deals.filter((deal) => deal.stage === 'won')
  const lost = deals.filter((deal) => deal.stage === 'lost')

  const pipeline = open.reduce((sum, deal) => sum + Number(deal.value || 0), 0)
  const revenue = won.reduce((sum, deal) => sum + Number(deal.value || 0), 0)
  const lostValue = lost.reduce((sum, deal) => sum + Number(deal.value || 0), 0)

  const now = Date.now()
  const idle = open.filter(
    (deal) =>
      now - new Date(deal.last_activity_at || deal.updated_at).getTime() >=
      24 * 60 * 60 * 1000,
  )
  const risk = idle.reduce((sum, deal) => sum + Number(deal.value || 0), 0)

  return (
    <>
      <div className="section-head">
        <div>
          <div className="brand">OVERVIEW</div>
          <h1 style={{ marginTop: 8 }}>Operação comercial</h1>
        </div>
        <Link className="button" href="/app/contacts">Novo lead</Link>
      </div>

      <div className="grid metrics">
        <article className="card metric">
          <span>Leads ativos</span>
          <strong>{contacts.filter((contact) => contact.status === 'lead').length}</strong>
        </article>
        <article className="card metric">
          <span>Oportunidades abertas</span>
          <strong>{open.length}</strong>
        </article>
        <article className="card metric">
          <span>Pipeline aberto</span>
          <strong>{money(pipeline)}</strong>
        </article>
        <article className="card metric">
          <span>Receita ganha</span>
          <strong>{money(revenue)}</strong>
          <small className="muted">{won.length} negócios ganhos</small>
        </article>
        <article className="card metric">
          <span>Valor perdido</span>
          <strong>{money(lostValue)}</strong>
          <small className="muted">{lost.length} negócios perdidos</small>
        </article>
        <article className="card metric">
          <span>Valor em risco</span>
          <strong>{money(risk)}</strong>
          <small className="muted">{idle.length} oportunidades sem atividade há 24h+</small>
        </article>
      </div>

      <div className="grid dashboard-secondary">
        <article className="card">
          <h2>Próxima ação</h2>
          <p className="muted">
            {idle.length > 0
              ? `Existem ${idle.length} oportunidades paradas que precisam de follow-up.`
              : 'Mantenha o pipeline atualizado para priorizar as próximas ações comerciais.'}
          </p>
          <Link href="/app/pipeline" className="button secondary">Abrir pipeline</Link>
        </article>
        <article className="card">
          <h2>Tarefas abertas</h2>
          <p className="dashboard-big-number">
            {tasks.filter((task) => task.status === 'open').length}
          </p>
        </article>
      </div>
    </>
  )
}
