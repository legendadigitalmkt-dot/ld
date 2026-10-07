import Link from 'next/link'
import { signOut } from '@/app/login/actions'
import type { CurrentWorkspace } from '@/lib/workspace'

export function AppShell({ workspace, children }: { workspace: CurrentWorkspace; children: React.ReactNode }) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">LD</div>
        <div className="workspace-name" style={{ marginTop: 12, fontWeight: 800 }}>{workspace.name}</div>
        <div className="workspace-name muted" style={{ fontSize: 12 }}>{workspace.role}</div>
        <nav>
          <Link href="/app">⌂ <span className="nav-label">Overview</span></Link>
          <Link href="/app/contacts">◎ <span className="nav-label">Contacts</span></Link>
          <Link href="/app/pipeline">◇ <span className="nav-label">Pipeline</span></Link>
          <Link href="/app/tasks">✓ <span className="nav-label">Tasks</span></Link>
          <Link href="/app/settings/members">⚙ <span className="nav-label">Equipe</span></Link>
        </nav>
        <div className="sidebar-footer">
          <form action={signOut}><button className="button secondary" type="submit" style={{ width: '100%' }}>Sair</button></form>
        </div>
      </aside>
      <section className="main">
        <header className="topbar">
          <strong>Growth OS</strong>
          <span className="muted">Production Foundation</span>
        </header>
        <main className="content">{children}</main>
      </section>
    </div>
  )
}
