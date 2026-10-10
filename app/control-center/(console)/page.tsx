import Link from "next/link";
import { requirePlatformPermission } from "@/lib/control";
import type { ControlOverview } from "@/lib/control-view";
import { createClient } from "@/lib/supabase/server";
import {
	ControlHeading,
	ControlMetric,
	ControlTime,
} from "@/components/control/ui";
import { AuditList } from "@/components/control/audit-list";
import styles from "@/components/control/control.module.css";
export default async function ControlOverviewPage() {
	const context = await requirePlatformPermission("overview.read");
	const client = await createClient();
	const { data, error } = await client.rpc("platform_overview");
	if (error || !data)
		throw new Error("Não foi possível carregar os indicadores.");
	const overview = data as unknown as ControlOverview;
	return (
		<>
			<ControlHeading
				eyebrow="CONTROL PLANE · MILESTONE 1"
				title="Visão da plataforma"
				description="Cadastros, workspaces e governança do Growth OS. Cada acesso administrativo fica registrado."
			/>
			<div className={styles.metrics}>
				<ControlMetric
					icon="contacts"
					label="Usuários"
					value={overview.users}
					note={`${overview.new_users_7d} novos nos últimos 7 dias`}
				/>
				<ControlMetric
					icon="team"
					label="Workspaces"
					value={overview.workspaces}
					note={`${overview.suspended_workspaces} com acesso suspenso`}
				/>
				<ControlMetric
					icon="shield"
					label="Administradores"
					value={overview.platform_admins}
					note="Contas com papéis explícitos no banco"
				/>
				<ControlMetric
					icon="lock"
					label="Contas suspensas"
					value={overview.suspended_users}
					note="Dados preservados durante a suspensão"
				/>
			</div>
			<div className={styles.split}>
				<section className={styles.panel}>
					<div className={styles.rowHeading}>
						<h2>Atividade administrativa</h2>
						{context.permissions.includes("audit.read") ? (
							<Link href="/control-center/audit">Abrir auditoria →</Link>
						) : null}
					</div>
					{overview.audit ? (
						<AuditList
							items={overview.audit}
							timezone={context.presentation?.timezone}
						/>
					) : (
						<p>Seu papel permite consultar os indicadores agregados.</p>
					)}
				</section>
				<section>
					<div className={styles.panel}>
						<h2>Fundação operacional</h2>
						<dl className={styles.facts}>
							<div>
								<dt>Workspace proprietário</dt>
								<dd>{context.owner_workspace?.name}</dd>
							</div>
							<div>
								<dt>Controle de acesso</dt>
								<dd>RBAC no banco · MFA obrigatório</dd>
							</div>
							<div>
								<dt>Dados atualizados em</dt>
								<dd>
									<ControlTime
										value={overview.as_of}
										timezone={context.presentation?.timezone}
									/>
								</dd>
							</div>
						</dl>
					</div>
					<div className={styles.notice}>
						<strong>Escopo desta entrega</strong>Users, Workspaces, permissões,
						auditoria e configurações gerais. Billing, marketing e intelligence
						entram nos próximos marcos aprovados.
					</div>
				</section>
			</div>
		</>
	);
}
