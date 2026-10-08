import { signIn, signUp } from './actions'
import Link from 'next/link'

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const error = typeof params.error === 'string' ? params.error : null
  const message = typeof params.message === 'string' ? params.message : null

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand">LEGENDA DIGITAL</div>
        <h1 style={{ marginTop: 14 }}>LD Growth OS</h1>
        <p className="muted">Entre para acessar o workspace da sua empresa.</p>
        {error ? <p className="error">{error}</p> : null}
        {message ? <p className="card">{message}</p> : null}
        <form className="stack" action={signIn}>
          <label>E-mail<input required name="email" type="email" autoComplete="email" /></label>
          <label>Senha<input required name="password" type="password" minLength={8} autoComplete="current-password" /></label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button className="button" type="submit" formAction={signIn}>Entrar</button>
            <button className="button secondary" type="submit" formAction={signUp}>Criar conta</button>
          </div>
        </form>
        <p><Link href="/forgot-password">Esqueci minha senha</Link></p>
      </section>
    </main>
  )
}
