import { AppShell } from '@/components/app-shell'
import { requireWorkspace } from '@/lib/workspace'

export const dynamic = 'force-dynamic'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const workspace = await requireWorkspace()
  return <AppShell workspace={workspace}>{children}</AppShell>
}
