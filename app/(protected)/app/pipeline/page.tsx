import { PipelineKanban, type PipelineDeal } from './pipeline-kanban'
import { createClient } from '@/lib/supabase/server'
import { requireWorkspace } from '@/lib/workspace'

export default async function PipelinePage() {
  const workspace = await requireWorkspace()
  const supabase = await createClient()
  const { data: deals, error } = await supabase
    .from('deals')
    .select('id,title,stage,value,probability,last_activity_at')
    .eq('workspace_id', workspace.id)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(`Failed to load pipeline: ${error.message}`)

  const pipelineDeals: PipelineDeal[] = (deals || []).map((deal) => ({
    id: deal.id,
    title: deal.title,
    stage: deal.stage,
    value: Number(deal.value || 0),
    probability: deal.probability,
    last_activity_at: deal.last_activity_at,
  }))

  const openValue = pipelineDeals
    .filter((deal) => !['won', 'lost'].includes(deal.stage))
    .reduce((sum, deal) => sum + deal.value, 0)

  return (
    <>
      <div className="section-head">
        <div>
          <div className="brand">REVENUE</div>
          <h1 style={{ marginTop: 8 }}>Pipeline</h1>
          <p className="muted">
            {pipelineDeals.length} oportunidades · {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(openValue)} em pipeline aberto
          </p>
        </div>
      </div>

      <PipelineKanban
        initialDeals={pipelineDeals}
        canEdit={workspace.role !== 'viewer'}
      />
    </>
  )
}
