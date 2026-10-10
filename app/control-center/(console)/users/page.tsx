import { requirePlatformPermission } from "@/lib/control";
import {
	controlQuery,
	controlRoleLabels,
	type ControlPage,
	type ControlUser,
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
export default async function UsersPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const context = await requirePlatformPermission("users.read");
	const filter = controlQuery(await searchParams);
	const client = await createClient();
	const { data, error } = await client.rpc("platform_users", {
		p_query: filter.query,
		p_status: filter.status,
		p_page: filter.page,
	});
	if (error || !data)
		throw new Error("Não foi possível carregar os cadastros.");
	const result = data as unknown as ControlPage<ControlUser>;
	return (
		<>
			<ControlHeading
				eyebrow="PLATAFORMA"
				title="Users"
				description="Cadastros e vínculos de acesso. Consulte os detalhes e registre o motivo ao suspender ou reativar uma conta."
			/>
			<ControlFilter
				base="/control-center/users"
				query={filter.query}
				status={filter.status}
			/>
			<section
				className={styles.tableWrap}
				aria-label="Cadastros de usuários, com rolagem horizontal"
				// biome-ignore lint/a11y/noNoninteractiveTabindex: Focus enables keyboard scrolling of this named data table region.
				tabIndex={0}
			>
				<table className={styles.table}>
					<thead>
						<tr>
							<th>Usuário</th>
							<th>Acesso</th>
							<th>Segurança</th>
							<th>Detalhes e ações</th>
						</tr>
					</thead>
					<tbody>
						{result.items.map((user) => (
							<tr key={user.id}>
								<td>
									<strong>{user.name || user.email || "Sem nome"}</strong>
									<small>{user.name ? user.email : user.id}</small>
									{user.protected ? (
										<span className={styles.type}>PLATFORM OWNER</span>
									) : null}
								</td>
								<td>
									<StatusBadge status={user.status} />
									<small>{user.memberships.length} workspace(s)</small>
								</td>
								<td>
									<strong>
										{user.verified_mfa
											? "MFA configurado"
											: "Sem MFA verificado"}
									</strong>
									<small>
										{user.confirmed ? "E-mail confirmado" : "E-mail pendente"} ·{" "}
										{user.sessions} sessões
									</small>
								</td>
								<td>
									<details>
										<summary>Ver cadastro</summary>
										<dl className={styles.facts}>
											<div>
												<dt>ID</dt>
												<dd>{user.id}</dd>
											</div>
											<div>
												<dt>Criado em</dt>
												<dd>
													<ControlTime
														value={user.created_at}
														timezone={context.presentation?.timezone}
													/>
												</dd>
											</div>
											<div>
												<dt>Último login</dt>
												<dd>
													<ControlTime
														value={user.last_sign_in_at}
														timezone={context.presentation?.timezone}
													/>
												</dd>
											</div>
											<div>
												<dt>Workspaces</dt>
												<dd>
													{user.memberships
														.map((m) => `${m.name} (${m.role})`)
														.join(" · ") || "Sem vínculo"}
												</dd>
											</div>
											<div>
												<dt>Papéis da plataforma</dt>
												<dd>
													{user.platform_roles
														.map((r) => controlRoleLabels[r])
														.join(" · ") || "Nenhum"}
												</dd>
											</div>
										</dl>
										{context.permissions.includes("users.suspend") &&
										!user.protected &&
										user.id !== context.user_id ? (
											<>
												<p>
													A suspensão bloqueia o acesso ao CRM. Dados e
													integrações permanecem preservados.
												</p>
												<AdminActionForm
													key={user.status}
													action={setControlStatus}
													label={
														user.status === "active"
															? "Suspender acesso"
															: "Reativar acesso"
													}
													danger={user.status === "active"}
												>
													<input type="hidden" name="entity" value="user" />
													<input type="hidden" name="id" value={user.id} />
													<input
														type="hidden"
														name="expected"
														value={user.status}
													/>
													<input
														type="hidden"
														name="status"
														value={
															user.status === "active" ? "suspended" : "active"
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
					<p className={styles.empty}>Nenhum usuário encontrado.</p>
				) : null}
			</section>
			<Pagination
				base="/control-center/users"
				query={filter.query}
				status={filter.status}
				page={result.page}
				total={result.total}
				size={result.page_size}
			/>
			<p className={styles.notice}>
				Senhas e tokens de sessão não são exibidos. A recuperação de senha
				continua pelo fluxo seguro de Auth em “Esqueci minha senha”.
			</p>
		</>
	);
}
