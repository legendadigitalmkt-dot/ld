import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformPermission } from "@/lib/control";
import {
	adminUUID,
	controlQuery,
	type ControlMembersPage,
} from "@/lib/control-view";
import { createClient } from "@/lib/supabase/server";
import {
	ControlHeading,
	ControlTime,
	Pagination,
	StatusBadge,
} from "@/components/control/ui";
import styles from "@/components/control/control.module.css";

export default async function WorkspaceMembersPage({
	params,
	searchParams,
}: {
	params: Promise<{ id: string }>;
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const context = await requirePlatformPermission("workspaces.read");
	await requirePlatformPermission("users.read");
	let id: string;
	try {
		id = adminUUID((await params).id);
	} catch {
		notFound();
	}
	const filter = controlQuery(await searchParams);
	const client = await createClient();
	const { data, error } = await client.rpc("platform_workspace_members", {
		p_workspace_id: id,
		p_page: filter.page,
	});
	if (error?.code === "22023") notFound();
	if (error || !data)
		throw new Error("Não foi possível consultar os membros do workspace.");
	const result = data as unknown as ControlMembersPage;
	const workspace = result.workspace;
	return (
		<>
			<ControlHeading
				eyebrow="PLATAFORMA · WORKSPACES"
				title={workspace.name}
				description="Consulta administrativa dos vínculos de acesso. Esta tela não abre a operação do cliente nem permite alterar membros."
			/>
			<p>
				<Link href="/control-center/workspaces">← Voltar aos workspaces</Link>
			</p>
			<section className={styles.panel} aria-label="Metadados do workspace">
				<StatusBadge status={workspace.status} />
				<dl className={styles.facts}>
					<div>
						<dt>ID</dt>
						<dd>{workspace.id}</dd>
					</div>
					<div>
						<dt>Slug</dt>
						<dd>{workspace.slug}</dd>
					</div>
					<div>
						<dt>Tipo</dt>
						<dd>
							{workspace.workspace_type === "platform_owner"
								? "Workspace proprietário"
								: "Cliente"}
						</dd>
					</div>
					<div>
						<dt>Criado em</dt>
						<dd>
							<ControlTime
								value={workspace.created_at}
								timezone={context.presentation?.timezone}
							/>
						</dd>
					</div>
				</dl>
			</section>
			<section
				className={styles.tableWrap}
				aria-label="Membros do workspace, com rolagem horizontal"
				// biome-ignore lint/a11y/noNoninteractiveTabindex: Enables keyboard scrolling of the named data-table region.
				tabIndex={0}
			>
				<table className={styles.table}>
					<thead>
						<tr>
							<th>Membro</th>
							<th>Papel no workspace</th>
							<th>Cadastro</th>
						</tr>
					</thead>
					<tbody>
						{result.items.map((member) => (
							<tr key={member.id}>
								<td>
									<strong>
										{member.name ||
											member.email ||
											"Sem identificação disponível"}
									</strong>
									<small>{member.email || member.id}</small>
								</td>
								<td>{member.role}</td>
								<td>
									<Link href={`/control-center/users?q=${member.id}`}>
										Consultar usuário →
									</Link>
								</td>
							</tr>
						))}
					</tbody>
				</table>
				{result.items.length === 0 ? (
					<p className={styles.empty}>Nenhum membro nesta página.</p>
				) : null}
			</section>
			<Pagination
				base={`/control-center/workspaces/${workspace.id}`}
				query=""
				page={result.page}
				total={result.total}
				size={result.page_size}
			/>
		</>
	);
}
