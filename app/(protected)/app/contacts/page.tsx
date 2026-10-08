import Link from "next/link";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/lib/workspace";
import { escapeSearch, uuidPattern } from "@/lib/workspace-selection";
import { dateTime, statusLabels } from "@/lib/operational";
import { SubmitButton } from "@/components/app/submit-button";
import { createContact } from "./actions";
import styles from "@/components/app/app.module.css";

export default async function ContactsPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const workspace = await requireWorkspace();
	const params = await searchParams;
	const search =
		typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
	const status =
		params.status === "lead" ||
		params.status === "customer" ||
		params.status === "inactive"
			? params.status
			: "all";
	const page = Math.max(
		1,
		Math.min(10000, Math.trunc(Number(params.page)) || 1),
	);
	const canEdit = workspace.role !== "viewer";
	const supabase = await createClient();
	let query = supabase
		.from("contacts")
		.select("id,name,phone,email,source,status,last_interaction_at", {
			count: "exact",
		})
		.eq("workspace_id", workspace.id);
	if (search) query = query.ilike("name", `%${escapeSearch(search)}%`);
	if (status !== "all") query = query.eq("status", status);
	const focusedContact =
		typeof params.contact === "string" && uuidPattern.test(params.contact)
			? params.contact
			: "";
	if (focusedContact) query = query.eq("id", focusedContact);
	const {
		data: contacts,
		error,
		count,
	} = await query
		.order("created_at", { ascending: false })
		.order("id")
		.range((page - 1) * 50, page * 50 - 1);
	if (error) throw new Error("Não foi possível carregar os contatos.");
	const url = (next: number) =>
		`/app/contacts?${new URLSearchParams({ q: search, status, page: String(next) })}`;
	const total = count || 0;
	return (
		<>
			<div className={styles.pageHeader}>
				<div>
					<span className={styles.eyebrow}>CRM</span>
					<h1>Relacionamentos com contexto.</h1>
					<p>
						Encontre seus contatos e defina o próximo passo do acompanhamento.
					</p>
				</div>
			</div>
			<form method="get" action="/app/contacts" className={styles.filterBar}>
				<label>
					Buscar por nome
					<input
						name="q"
						type="search"
						maxLength={80}
						defaultValue={search}
						placeholder="Nome do contato"
					/>
				</label>
				<label>
					Status
					<select name="status" defaultValue={status}>
						<option value="all">Todos</option>
						<option value="lead">Lead</option>
						<option value="customer">Cliente</option>
						<option value="inactive">Inativo</option>
					</select>
				</label>
				<button className="button secondary" type="submit">
					Aplicar filtros
				</button>
				{search || status !== "all" ? (
					<Link href="/app/contacts" className="button secondary">
						Limpar
					</Link>
				) : null}
			</form>
			{canEdit ? (
				<section
					id="new-contact"
					className={styles.panel}
					style={{ marginBottom: 22, scrollMarginTop: 100 }}
				>
					<div className={styles.panelHeader}>
						<div>
							<h2>Novo lead</h2>
							<p>O cadastro também cria uma oportunidade no pipeline.</p>
						</div>
					</div>
					<form action={createContact} className="inline-form">
						<input type="hidden" name="intakeKey" value={randomUUID()} />
						<label>
							Nome
							<input
								name="name"
								required
								minLength={2}
								maxLength={160}
								placeholder="Nome do lead"
							/>
						</label>
						<label>
							Telefone
							<input
								name="phone"
								type="tel"
								maxLength={40}
								placeholder="+55..."
							/>
						</label>
						<label>
							Origem
							<select name="source" defaultValue="Manual">
								<option>Manual</option>
								<option>WhatsApp</option>
								<option>Instagram</option>
								<option>Meta Ads</option>
								<option>Google</option>
								<option>Indicação</option>
							</select>
						</label>
						<SubmitButton primary>Adicionar lead</SubmitButton>
					</form>
				</section>
			) : null}
			{focusedContact ? (
				<p className={styles.notice}>
					Consulta do contato selecionado.{" "}
					<Link href="/app/contacts">Mostrar todos →</Link>
				</p>
			) : null}
			<p className={styles.resultCount}>
				{total} contatos encontrados · página {page} de{" "}
				{Math.max(1, Math.ceil(total / 50))}
			</p>
			{contacts?.length ? (
				<section className="card table-wrap">
					<table>
						<thead>
							<tr>
								<th>Contato</th>
								<th>Origem</th>
								<th>Status</th>
								<th>Última interação</th>
								{canEdit ? <th>Próxima ação</th> : null}
							</tr>
						</thead>
						<tbody>
							{contacts.map((contact) => (
								<tr key={contact.id}>
									<td>
										<strong>{contact.name}</strong>
										<br />
										<span className="muted">
											{contact.phone || contact.email || "Sem canal cadastrado"}
										</span>
									</td>
									<td>{contact.source || "Sem origem"}</td>
									<td>
										<span className="badge">
											{statusLabels[contact.status]}
										</span>
									</td>
									<td>
										{contact.last_interaction_at
											? dateTime(
													contact.last_interaction_at,
													workspace.timezone,
												)
											: "Sem interação registrada"}
									</td>
									{canEdit ? (
										<td>
											<Link
												href={`/app/tasks?contact=${contact.id}`}
												className={styles.submitButton}
											>
												Criar tarefa →
											</Link>
										</td>
									) : null}
								</tr>
							))}
						</tbody>
					</table>
				</section>
			) : (
				<section className={styles.empty}>
					<strong>
						{search || status !== "all"
							? "Nenhum contato com esses filtros."
							: "Sua base de contatos começa aqui."}
					</strong>
					<p>
						{search || status !== "all"
							? "Ajuste a busca ou limpe os filtros."
							: "Cadastre um lead para iniciar o acompanhamento comercial."}
					</p>
				</section>
			)}
			{total > 50 || page > 1 ? (
				<nav aria-label="Paginação dos contatos" className={styles.pagination}>
					{page > 1 ? <Link href={url(page - 1)}>← Anterior</Link> : <span />}
					{page * 50 < total ? (
						<Link href={url(page + 1)}>Próxima →</Link>
					) : (
						<span />
					)}
				</nav>
			) : null}
		</>
	);
}
