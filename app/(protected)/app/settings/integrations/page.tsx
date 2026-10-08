import { redirect } from 'next/navigation'
import { getWhatsAppWebhookUrl } from '@/lib/meta/whatsapp'
import { createClient } from '@/lib/supabase/server'
import { isWorkspaceAdmin, requireWorkspace } from '@/lib/workspace'
import { connectWhatsApp, diagnoseWhatsApp } from './actions'

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const workspace = await requireWorkspace()
  if (!isWorkspaceAdmin(workspace.role)) redirect('/app')

  const params = await searchParams
  const errorMessage = typeof params.error === 'string' ? params.error : null
  const message = typeof params.message === 'string' ? params.message : null
  let diagnostic: Array<{ operation: string; ok: boolean; summary: string }> = []
  if (typeof params.diagnostic === 'string') {
    try {
      diagnostic = JSON.parse(Buffer.from(params.diagnostic, 'base64url').toString('utf8'))
    } catch {
      diagnostic = []
    }
  }

  const supabase = await createClient()
  const { data: connection, error } = await supabase
    .from('integration_connections')
    .select('id,status,external_account_id,external_resource_id,connected_at,last_error,metadata')
    .eq('workspace_id', workspace.id)
    .eq('provider', 'whatsapp_cloud')
    .maybeSingle()

  if (error) throw new Error(`Failed to load integrations: ${error.message}`)

  const metadata = connection?.metadata && typeof connection.metadata === 'object' && !Array.isArray(connection.metadata)
    ? connection.metadata as Record<string, unknown>
    : {}

  return (
    <>
      <div className="section-head">
        <div>
          <div className="brand">CHANNELS</div>
          <h1 style={{ marginTop: 8 }}>Integrações</h1>
          <p className="muted">Conecte o número oficial usado pelo Inbox do LD Growth OS.</p>
        </div>
      </div>

      {errorMessage ? <p className="error">{errorMessage}</p> : null}
      {message ? <p className="card">{message}</p> : null}

      <section className="card" style={{ marginBottom: 16 }}>
        <div className="section-head">
          <div>
            <h2>WhatsApp Cloud API</h2>
            <p className="muted">Webhook oficial Meta, mensagens recebidas e status de entrega.</p>
          </div>
          <span className="badge">{connection?.status || 'not_connected'}</span>
        </div>

        {connection ? (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}>
            <div><span className="muted">Número</span><p>{String(metadata.display_phone_number || '—')}</p></div>
            <div><span className="muted">WABA ID</span><p>{connection.external_account_id || '—'}</p></div>
            <div><span className="muted">Phone Number ID</span><p>{connection.external_resource_id || '—'}</p></div>
          </div>
        ) : null}

        <p className="muted" style={{ marginBottom: 6 }}>Callback URL</p>
        <code className="code-line">{getWhatsAppWebhookUrl()}</code>
      </section>

      <form action={diagnoseWhatsApp} className="card stack" style={{ marginBottom: 16 }}>
        <h2>Diagnóstico seguro da Meta</h2>
        <p className="muted">
          Executa sete leituras server-side para verificar identidade, permissões, ativos visíveis e a WABA informada. O token nunca é exibido, enviado ao navegador ou persistido; somente resultados sanitizados são apresentados.
        </p>
        <label>
          WABA ID
          <input name="wabaId" required inputMode="numeric" defaultValue={connection?.external_account_id || ''} />
        </label>
        <label>
          Phone Number ID
          <input name="phoneNumberId" required inputMode="numeric" defaultValue={connection?.external_resource_id || ''} />
        </label>
        <button className="button" type="submit">Executar diagnóstico</button>
        {diagnostic.length ? (
          <div className="stack">
            {diagnostic.map((item) => (
              <div className="code-line" key={item.operation}>
                <strong>{item.ok ? 'OK' : 'FALHA'} — {item.operation}</strong><br />
                {item.summary}
              </div>
            ))}
          </div>
        ) : null}
      </form>

      <form action={connectWhatsApp} className="card stack">
        <h2>{connection ? 'Atualizar conexão' : 'Conectar WhatsApp'}</h2>
        <p className="muted">
          O token fica somente no ambiente do servidor. O LD valida se o número pertence ao WABA e inscreve o app em <code>/subscribed_apps</code>.
        </p>
        <label>
          WhatsApp Business Account ID (WABA ID)
          <input name="wabaId" required inputMode="numeric" defaultValue={connection?.external_account_id || ''} />
        </label>
        <label>
          Phone Number ID
          <input name="phoneNumberId" required inputMode="numeric" defaultValue={connection?.external_resource_id || ''} />
        </label>
        <button className="button" type="submit">Validar e conectar</button>
      </form>
    </>
  )
}
