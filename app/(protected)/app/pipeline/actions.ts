'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireModule } from "@/lib/product";

export type PipelineStage =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost'

const stages: PipelineStage[] = [
  'new',
  'contacted',
  'qualified',
  'proposal',
  'negotiation',
  'won',
  'lost',
]

function refreshPipeline() {
  revalidatePath('/app/pipeline')
  revalidatePath('/app')
  revalidatePath('/app/results')
  revalidatePath('/app/contacts')
}

export async function moveDealStageAction(dealId: string, stage: PipelineStage) {
  const workspace = await requireModule("crm")

  if (workspace.role === 'viewer') {
    return { ok: false as const, error: 'Seu papel não permite alterar oportunidades.' }
  }

  if (!dealId || !stages.includes(stage)) {
    return { ok: false as const, error: 'Movimentação inválida.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('move_deal_stage', {
    p_workspace_id: workspace.id,
    p_deal_id: dealId,
    p_stage: stage,
  })

  if (error) return { ok: false as const, error: error.message }

  refreshPipeline()
  return { ok: true as const, deal: data?.[0] || null }
}

export async function updateDealValueAction(dealId: string, value: number) {
  const workspace = await requireModule("crm")

  if (workspace.role === 'viewer') {
    return { ok: false as const, error: 'Seu papel não permite alterar oportunidades.' }
  }

  if (!dealId || !Number.isFinite(value) || value < 0) {
    return { ok: false as const, error: 'Informe um valor válido.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('update_deal_value', {
    p_workspace_id: workspace.id,
    p_deal_id: dealId,
    p_value: value,
  })

  if (error) return { ok: false as const, error: error.message }

  refreshPipeline()
  return { ok: true as const, deal: data?.[0] || null }
}
