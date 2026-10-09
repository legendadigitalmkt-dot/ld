import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace, isWorkspaceAdmin } from "@/lib/workspace";
import { WorkspaceForm } from "@/components/contacts/workspace-form";
import styles from "@/components/contacts/profile.module.css";
export default async function SettingsPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const current = await requireWorkspace();
	if (!isWorkspaceAdmin(current.role)) notFound();
	const query = await searchParams;
	const supabase = await createClient();
	const { data: workspace, error } = await supabase
		.from("workspaces")
		.select("id,name,slug,segment,timezone,updated_at")
		.eq("id", current.id)
		.maybeSingle();
	if (error) throw new Error("Não foi possível carregar as configurações.");
	if (!workspace) notFound();
	const timezones = [
		...new Set([
			workspace.timezone,
			"UTC",
			...Intl.supportedValuesOf("timeZone"),
		]),
	].sort();
	return (
		<>
			<header className={styles.profileHero}>
				<div className={styles.identity}>
					<div>
						<span className={styles.kicker}>WORKSPACE · CONFIGURAÇÕES</span>
						<h1>Uma base alinhada à sua operação.</h1>
						<p>Nome, segmento e fuso usados pela equipe.</p>
					</div>
				</div>
			</header>
			{query.saved === "workspace" ? (
				<p role="status" className={styles.success}>
					Configurações salvas.
				</p>
			) : null}
			<div className={styles.layout}>
				<section className={styles.panel}>
					<h2>Perfil do workspace</h2>
					<p>
						Somente proprietários e administradores podem alterar estas
						configurações.
					</p>
					<WorkspaceForm
						key={workspace.updated_at}
						workspace={workspace}
						timezones={timezones}
					/>
				</section>
				<aside className={styles.column}>
					<section className={styles.panel}>
						<h2>Equipe e conexões</h2>
						<Link className={styles.record} href="/app/settings/members">
							<strong>Membros e permissões</strong>
							<span aria-hidden="true">→</span>
						</Link>
						<Link className={styles.record} href="/app/settings/integrations">
							<strong>Integrações e diagnóstico</strong>
							<span aria-hidden="true">→</span>
						</Link>
					</section>
					<section className={styles.panel}>
						<h2>Identificação</h2>
						<dl className={styles.facts}>
							<div>
								<dt>WORKSPACE</dt>
								<dd>{workspace.slug}</dd>
							</div>
							<div>
								<dt>FUSO ATUAL</dt>
								<dd>{workspace.timezone.replaceAll("_", " ")}</dd>
							</div>
						</dl>
						<p className={styles.hint}>
							O identificador permanece estável ao atualizar o nome da empresa.
							Alterações são registradas nas atividades do workspace.
						</p>
					</section>
				</aside>
			</div>
		</>
	);
}
