import { requirePlatformPermission } from "@/lib/control";
import {
	controlQuery,
	type ControlPage,
	type ControlWorkspace,
} from "@/lib/control-view";
import { createClient } from "@/lib/supabase/server";
import {
	ControlHeading,
	ControlTime,
	Pagination,
	StatusBadge,
} from "@/components/control/ui";
import { ControlFilter } from "@/components/control/filter";
import { AdminActionForm } from "@/components/control/admin-action-form";
import { setControlStatus } from "../actions";
import styles from "@/components/control/control.module.css";
export default async function WorkspacesPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const context = await requirePlatformPermission("workspaces.read");
	const filter = controlQuery(await searchParams);
	const client = await createClient();
	const { data, error } = await client.rpc("platform_workspaces", {
		p_query: filter.query,
		p_status: filter.status,
		p_page: filter.page,
	});
	if (error || !data)
		throw new Error("Não foi possível carregar os workspaces.");
	const result = data as unknown as ControlPage<ControlWorkspace>;
	return (
		<>
			<ControlHeading
				eyebrow="PLATAFORMA"
				title="Workspaces"
				description="Inventário de tenants e contagens operacionais. O workspace proprietário é identificado pelo registro da plataforma, independente do nome."
			/>
			<ControlFilter
				base="/control-center/workspaces"
				query={filter.query}
				status={filter.status}
				placeholder="Nome, slug ou ID"
			/>
			<div className={styles.tableWrap}>
				<table className={styles.table}>
					<thead>
						<tr>
							<th>Workspace</th>
							<th>Status</th>
							<th>Operação</th>
							<th>Detalhes e ações</th>
						</tr>
					</thead>
					<tbody>
						{result.items.map((w) => (
							<tr key={w.id}>
								<td>
									<strong>{w.name}</strong>
									<small>{w.slug}</small>
									{w.workspace_type === "platform_owner" ? (
										<span className={styles.type}>PLATFORM OWNER</span>
									) : null}
								</td>
								<td>
									<StatusBadge status={w.status} />
									<small>{w.members} membros</small>
								</td>
								<td>
									<strong>
										{w.contacts} contatos · {w.deals} oportunidades
									</strong>
									<small>{w.open_tasks} tarefas abertas</small>
								</td>
								<td>
									<details>
										<summary>Ver workspace</summary>
										<dl className={styles.facts}>
											<div>
												<dt>ID</dt>
												<dd>{w.id}</dd>
											</div>
											<div>
												<dt>Criado em</dt>
												<dd>
													<ControlTime
														value={w.created_at}
														timezone={context.presentation?.timezone}
													/>
												</dd>
											</div>
											{w.owners.length ? (
												<div>
													<dt>Responsáveis</dt>
													<dd>{w.owners.join(" · ")}</dd>
												</div>
											) : null}
											<div>
												<dt>Integrações</dt>
												<dd>
													{w.integrations
														.map((i) => `${i.provider}: ${i.status}`)
														.join(" · ") || "Nenhuma conexão cadastrada"}
												</dd>
											</div>
										</dl>
										{context.permissions.includes("workspaces.suspend") &&
										w.workspace_type === "customer" ? (
											<>
												<p>
													A suspensão bloqueia o acesso dos membros a este
													workspace. Ela não interrompe os webhooks nem apaga
													dados.
												</p>
												<AdminActionForm
													key={w.status}
													action={setControlStatus}
													label={
														w.status === "active"
															? "Suspender workspace"
															: "Reativar workspace"
													}
													danger={w.status === "active"}
												>
													<input
														type="hidden"
														name="entity"
														value="workspace"
													/>
													<input type="hidden" name="id" value={w.id} />
													<input
														type="hidden"
														name="expected"
														value={w.status}
													/>
													<input
														type="hidden"
														name="status"
														value={
															w.status === "active" ? "suspended" : "active"
														}
													/>
												</AdminActionForm>
											</>
										) : null}
									</details>
								</td>
							</tr>
						))}
					</tbody>
				</table>
				{result.items.length === 0 ? (
					<p className={styles.empty}>Nenhum workspace encontrado.</p>
				) : null}
			</div>
			<Pagination
				base="/control-center/workspaces"
				query={filter.query}
				status={filter.status}
				page={result.page}
				total={result.total}
				size={result.page_size}
			/>
		</>
	);
}
