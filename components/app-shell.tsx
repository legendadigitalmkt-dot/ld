import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getPlatformContext } from "@/lib/control";
import { createClient } from "@/lib/supabase/server";
import {
	getAccessibleWorkspaces,
	isWorkspaceAdmin,
	type CurrentWorkspace,
} from "@/lib/workspace";
import { roleLabels } from "@/lib/operational";
import { Icon, GrowthMark } from "@/components/ui/icons";
import { AppNavigation } from "@/components/app/navigation";
import { MobileNavigation } from "@/components/app/mobile-navigation";
import { AppControls, WorkspacePicker } from "@/components/app/controls";
import styles from "@/components/app/app.module.css";

export async function AppShell({
	workspace,
	children,
}: {
	workspace: CurrentWorkspace;
	children: React.ReactNode;
}) {
	const supabase = await createClient();
	const control = await getPlatformContext();
	const [user, workspaces, overdue, unread] = await Promise.all([
		requireUser(),
		getAccessibleWorkspaces(),
		supabase
			.from("tasks")
			.select("id", { count: "exact", head: true })
			.eq("workspace_id", workspace.id)
			.eq("status", "open")
			.lt("due_at", new Date().toISOString()),
		supabase
			.from("conversations")
			.select("id", { count: "exact", head: true })
			.eq("workspace_id", workspace.id)
			.gt("unread_count", 0),
	]);
	return (
		<div className={styles.appShell}>
			<a href="#growth-main" className={styles.skipLink}>
				Pular para o conteúdo
			</a>
			<aside className={styles.sidebar}>
				<Link
					href="/app"
					className={styles.brand}
					aria-label="Growth OS — visão geral"
				>
					<GrowthMark />
					<div>
						<strong>Growth OS</strong>
						<small>by Legenda Digital</small>
					</div>
				</Link>
				<div className={styles.workspaceCard}>
					<span>WORKSPACE</span>
					<strong>{workspace.name}</strong>
					<small>{roleLabels[workspace.role]}</small>
				</div>
				<AppNavigation admin={isWorkspaceAdmin(workspace.role)} />
				<div className={styles.sidebarBottom}>
					{control.eligible ? (
						<Link href="/control-center" className={styles.portalLink}>
							<Icon name="shield" /> Control Center
						</Link>
					) : null}
					<WorkspacePicker
						workspace={workspace}
						workspaces={workspaces}
						instance="sidebar"
					/>
					<Link href="/" className={styles.portalLink}>
						Conheça o produto <Icon name="arrow" />
					</Link>
				</div>
			</aside>
			<section className={styles.mainArea}>
				<header>
					<AppControls
						platformAccess={control.eligible}
						key={workspace.id}
						workspace={workspace}
						workspaces={workspaces}
						email={user.email}
						notices={{
							overdue: overdue.count || 0,
							unread: unread.count || 0,
							available: !overdue.error && !unread.error,
						}}
					/>
				</header>
				<main id="growth-main" className={styles.content}>
					{children}
				</main>
			</section>
			<MobileNavigation />
		</div>
	);
}
