import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { resetPassword } from './actions'

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) redirect('/forgot-password?error=Solicite%20um%20link%20para%20recuperar%20o%20acesso.')
  const params = await searchParams
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand">LEGENDA DIGITAL</div>
        <h1 style={{ marginTop: 14 }}>Definir nova senha</h1>
        {typeof params.error === 'string' ? <p className="error" role="alert">{params.error}</p> : null}
        <form className="stack" action={resetPassword}>
          <label>Nova senha<input required name="password" type="password" minLength={8} autoComplete="new-password" /></label>
          <label>Confirmar nova senha<input required name="confirmation" type="password" minLength={8} autoComplete="new-password" /></label>
          <button className="button" type="submit">Salvar nova senha</button>
        </form>
      </section>
    </main>
  )
}
