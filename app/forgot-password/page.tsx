import Link from 'next/link'
import { requestPasswordReset } from './actions'

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand">LEGENDA DIGITAL</div>
        <h1 style={{ marginTop: 14 }}>Recuperar acesso</h1>
        <p className="muted">Use o e-mail da sua conta para receber um link de recuperação.</p>
        {typeof params.error === 'string' ? <p className="error" role="alert">{params.error}</p> : null}
        {typeof params.message === 'string' ? <p className="card" role="status">{params.message}</p> : null}
        <form className="stack" action={requestPasswordReset}>
          <label>E-mail<input required name="email" type="email" autoComplete="email" /></label>
          <button className="button" type="submit">Enviar link de recuperação</button>
        </form>
        <p><Link href="/login">Voltar para o login</Link></p>
      </section>
    </main>
  )
}
