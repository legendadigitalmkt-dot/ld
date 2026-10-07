import { redirect } from 'next/navigation'
import { getCurrentWorkspace } from '@/lib/workspace'
import { createWorkspace } from './actions'

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (await getCurrentWorkspace()) redirect('/app')
  const params = await searchParams
  const error = typeof params.error === 'string' ? params.error : null

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand">LEGENDA DIGITAL</div>
        <h1 style={{ marginTop: 14 }}>Crie seu workspace</h1>
        <p className="muted">A empresa será o limite de isolamento dos seus dados, membros e operações.</p>
        {error ? <p className="error">{error}</p> : null}
        <form action={createWorkspace} className="stack">
          <label>Empresa<input name="name" required minLength={2} maxLength={120} placeholder="Clínica Viva" /></label>
          <label>Segmento<input name="segment" maxLength={120} placeholder="Clínica de estética" /></label>
          <button className="button">Criar workspace</button>
        </form>
      </section>
    </main>
  )
}
