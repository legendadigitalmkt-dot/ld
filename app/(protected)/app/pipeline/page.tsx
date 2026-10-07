import { createClient } from '@/lib/supabase/server'
import { requireWorkspace } from '@/lib/workspace'

const stages = [
  ['new', 'Novo'], ['contacted', 'Contato'], ['qualified', 'Qualificado'], ['proposal', 'Proposta'], ['negotiation', 'Negociação'],
] as const

export default async function PipelinePage() {
  const workspace = await requireWorkspace()
  const supabase = await createClient()
  const { data: deals, error } = await supabase
    .from('deals')
    .select('id,title,stage,value,probability,last_activity_at,contact:contacts(name)')
    .eq('workspace_id', workspace.id)
    .not('stage', 'in', '(won,lost)')
    .order('updated_at', { ascending: false })
  if (error) throw new Error(`Failed to load pipeline: ${error.message}`)

  return (
    <>
      <div className="section-head"><div><div className="brand">REVENUE</div><h1 style={{ marginTop: 8 }}>Pipeline</h1></div></div>
      <div className="pipeline">
        {stages.map(([stage, label]) => {
          const stageDeals = (deals || []).filter((deal) => deal.stage === stage)
          return <section className="column" key={stage}><strong>{label}</strong><span className="muted" style={{ float: 'right' }}>{stageDeals.length}</span>{stageDeals.map((deal) => <article className="deal" key={deal.id}><strong>{deal.title}</strong><span>{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(deal.value || 0))}</span><p className="muted" style={{ margin: '8px 0 0', fontSize: 12 }}>{Array.isArray(deal.contact) ? deal.contact[0]?.name : deal.contact?.name} · {deal.probability}%</p></article>)}</section>
        })}
      </div>
    </>
  )
}
