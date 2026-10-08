'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  moveDealStageAction,
  type PipelineStage,
  updateDealValueAction,
} from './actions'

export type PipelineDeal = {
  id: string
  title: string
  stage: PipelineStage
  value: number
  probability: number
  last_activity_at: string
}

const stageDefinitions: Array<{
  id: PipelineStage
  label: string
  probability: number
  tone?: 'success' | 'danger'
}> = [
  { id: 'new', label: 'Novo', probability: 20 },
  { id: 'contacted', label: 'Contato', probability: 30 },
  { id: 'qualified', label: 'Qualificado', probability: 50 },
  { id: 'proposal', label: 'Proposta', probability: 70 },
  { id: 'negotiation', label: 'Negociação', probability: 85 },
  { id: 'won', label: 'Ganho', probability: 100, tone: 'success' },
  { id: 'lost', label: 'Perdido', probability: 0, tone: 'danger' },
]

function money(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function PipelineKanban({
  initialDeals,
  canEdit,
}: {
  initialDeals: PipelineDeal[]
  canEdit: boolean
}) {
  const router = useRouter()
  const [deals, setDeals] = useState(initialDeals)
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null)
  const [editingDealId, setEditingDealId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const stageTotals = useMemo(
    () =>
      Object.fromEntries(
        stageDefinitions.map((stage) => [
          stage.id,
          deals
            .filter((deal) => deal.stage === stage.id)
            .reduce((sum, deal) => sum + Number(deal.value || 0), 0),
        ]),
      ) as Record<PipelineStage, number>,
    [deals],
  )

  function moveDeal(dealId: string, nextStage: PipelineStage) {
    if (!canEdit || isPending) return

    const previous = deals
    const probability = stageDefinitions.find((stage) => stage.id === nextStage)?.probability ?? 0

    setError(null)
    setDeals((current) =>
      current.map((deal) =>
        deal.id === dealId
          ? { ...deal, stage: nextStage, probability, last_activity_at: new Date().toISOString() }
          : deal,
      ),
    )

    startTransition(async () => {
      const result = await moveDealStageAction(dealId, nextStage)
      if (!result.ok) {
        setDeals(previous)
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  function saveValue(dealId: string, rawValue: string) {
    if (!canEdit || isPending) return

    const normalized = rawValue.replace(',', '.')
    const value = Number(normalized)
    if (!Number.isFinite(value) || value < 0) {
      setError('Informe um valor válido para a oportunidade.')
      return
    }

    const previous = deals
    setError(null)
    setDeals((current) =>
      current.map((deal) => (deal.id === dealId ? { ...deal, value } : deal)),
    )
    setEditingDealId(null)

    startTransition(async () => {
      const result = await updateDealValueAction(dealId, value)
      if (!result.ok) {
        setDeals(previous)
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <>
      {error ? <p className="error pipeline-error">{error}</p> : null}
      <div className="pipeline pipeline-kanban" aria-busy={isPending}>
        {stageDefinitions.map((stage) => {
          const stageDeals = deals.filter((deal) => deal.stage === stage.id)

          return (
            <fieldset
              className={`column pipeline-column ${stage.tone ? `pipeline-column-${stage.tone}` : ''}`}
              key={stage.id}
              onDragOver={(event) => {
                if (canEdit) event.preventDefault()
              }}
              onDrop={(event) => {
                event.preventDefault()
                const dealId = event.dataTransfer.getData('text/plain') || draggedDealId
                if (dealId) moveDeal(dealId, stage.id)
                setDraggedDealId(null)
              }}
            >
              <legend className="sr-only">Estágio ${stage.label}</legend>
              <header className="pipeline-column-head">
                <div>
                  <strong>{stage.label}</strong>
                  <small>{money(stageTotals[stage.id])}</small>
                </div>
                <span className="pipeline-count">{stageDeals.length}</span>
              </header>

              <div className="pipeline-card-list">
                {stageDeals.map((deal) => (
                  <article
                    className="deal pipeline-deal"
                    id={`deal-${deal.id}`}
                    key={deal.id}
                    draggable={canEdit && !isPending}
                    onDragStart={(event) => {
                      setDraggedDealId(deal.id)
                      event.dataTransfer.effectAllowed = 'move'
                      event.dataTransfer.setData('text/plain', deal.id)
                    }}
                    onDragEnd={() => setDraggedDealId(null)}
                  >
                    <strong>{deal.title}</strong>

                    {editingDealId === deal.id ? (
                      <form
                        className="deal-value-form"
                        onSubmit={(event) => {
                          event.preventDefault()
                          const form = new FormData(event.currentTarget)
                          saveValue(deal.id, String(form.get('value') || '0'))
                        }}
                      >
                        <input
                          aria-label="Valor da oportunidade"
                          name="value"
                          inputMode="decimal"
                          defaultValue={Number(deal.value || 0).toFixed(2)}
                        />
                        <button className="mini-button" type="submit">Salvar</button>
                        <button
                          className="mini-button secondary"
                          type="button"
                          onClick={() => setEditingDealId(null)}
                        >
                          Cancelar
                        </button>
                      </form>
                    ) : (
                      <button
                        className="deal-value-button"
                        type="button"
                        disabled={!canEdit || isPending}
                        onClick={() => setEditingDealId(deal.id)}
                        title="Editar valor da oportunidade"
                      >
                        {money(Number(deal.value || 0))}
                      </button>
                    )}

                    <div className="deal-meta">
                      <span>{deal.probability}% de probabilidade</span>
                      <span>
                        {new Intl.DateTimeFormat('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        }).format(new Date(deal.last_activity_at))}
                      </span>
                    </div>

                    <label className="deal-stage-select">
                      <span>Estágio</span>
                      <select
                        value={deal.stage}
                        disabled={!canEdit || isPending}
                        onChange={(event) => moveDeal(deal.id, event.target.value as PipelineStage)}
                      >
                        {stageDefinitions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </article>
                ))}

                {stageDeals.length === 0 ? (
                  <div className="pipeline-empty">Arraste uma oportunidade para cá</div>
                ) : null}
              </div>
            </fieldset>
          )
        })}
      </div>
      <p className="muted pipeline-help">
        Arraste os cards entre as colunas ou altere o estágio no seletor. Mudanças são persistidas imediatamente.
      </p>
    </>
  )
}
