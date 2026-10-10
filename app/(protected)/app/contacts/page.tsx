import Link from "next/link";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/product";
import { escapeSearch, uuidPattern } from "@/lib/workspace-selection";
import { Icon } from "@/components/ui/icons";
import { RefreshResults } from "@/components/app/dashboard-interactions";
import { dateTime, statusLabels } from "@/lib/operational";
import { SubmitButton } from "@/components/app/submit-button";
import { createContact } from "./actions";
import styles from "@/components/app/app.module.css";

export default async function ContactsPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const workspace = await requireModule("crm");
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
	const tag =
		typeof params.tag === "string" ? params.tag.trim().slice(0, 32) : "";
	const source =
		typeof params.source === "string" ? params.source.trim().slice(0, 80) : "";
	const canEdit = workspace.role !== "viewer";
	const supabase = await createClient();
	let query = supabase
		.from("contacts")
		.select(
			"id,name,company,phone,email,source,status,tags,last_interaction_at",
			{
				count: "exact",
			},
		)
		.eq("workspace_id", workspace.id);
	if (search) query = query.ilike("name", `%${escapeSearch(search)}%`);
	if (status !== "all") query = query.eq("status", status);
	if (tag) query = query.contains("tags", [tag]);
	if (source) query = query.eq("source", source);
	const focusedContact =
		typeof params.contact === "string" && uuidPattern.test(params.contact)
			? params.contact
			: "";
	if (focusedContact) query = query.eq("id", focusedContact);
	const [records, allContacts, leadsCount, customersCount] = await Promise.all([
		query
			.order("created_at", { ascending: false })
			.order("id")
			.range((page - 1) * 50, page * 50 - 1),
		supabase
			.from("contacts")
			.select("id", { count: "exact", head: true })
			.eq("workspace_id", workspace.id),
		supabase
			.from("contacts")
			.select("id", { count: "exact", head: true })
			.eq("workspace_id", workspace.id)
			.eq("status", "lead"),
		supabase
			.from("contacts")
			.select("id", { count: "exact", head: true })
			.eq("workspace_id", workspace.id)
			.eq("status", "customer"),
	]);
	const { data: contacts, error, count } = records;
	if (allContacts.error || leadsCount.error || customersCount.error)
		throw new Error("Não foi possível carregar o resumo dos contatos.");
	if (error) throw new Error("Não foi possível carregar os contatos.");
	const url = (next: number) =>
		`/app/contacts?${new URLSearchParams({ q: search, status, tag, source, ...(focusedContact ? { contact: focusedContact } : {}), page: String(next) })}`;
	const total = count || 0;
	const statusUrl = (next: string) =>
		`/app/contacts?${new URLSearchParams({ q: search, tag, source, status: next })}`;
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
				<div className={styles.headerActions}>
					<RefreshResults />
					{canEdit ? (
						<Link href="/app/contacts?new=1#new-contact" className="button">
							<Icon name="plus" />
							&nbsp;Novo lead
						</Link>
					) : null}
				</div>
			</div>
			<section
				className={styles.crmSummary}
				aria-label="Resumo da base de contatos"
			>
				{[
					["Todos os contatos", allContacts.count || 0, "all"],
					["Leads", leadsCount.count || 0, "lead"],
					["Clientes", customersCount.count || 0, "customer"],
				].map(([label, value, next]) => (
					<Link
						key={String(next)}
						href={statusUrl(String(next))}
						aria-current={status === next ? "page" : undefined}
					>
						<Icon name="contacts" />
						<span>{label}</span>
						<strong>{value}</strong>
					</Link>
				))}
			</section>
			{params.error === "plan_limit" ? (
				<p role="alert" className={styles.notice}>
					Limite do plano atingido.{" "}
					<Link href="/app/settings/plan">Confira plano e consumo</Link> antes
					de criar outro contato e oportunidade.
				</p>
			) : null}
			{params.created === "1" ? (
				<p className={styles.successNotice} role="status">
					<Icon name="check" />
					Lead cadastrado e oportunidade criada no pipeline.{" "}
					<Link href="/app/pipeline">Ver funil →</Link>
				</p>
			) : null}
			<form
				method="get"
				action="/app/contacts"
				className={styles.filterBar}
				style={{ gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}
			>
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
				<label>
					Origem
					<select name="source" defaultValue={source}>
						<option value="">Todas as origens</option>
						{source &&
						![
							"Manual",
							"WhatsApp",
							"Instagram",
							"Meta Ads",
							"Google",
							"Indicação",
						].includes(source) ? (
							<option>{source}</option>
						) : null}
						{[
							"Manual",
							"WhatsApp",
							"Instagram",
							"Meta Ads",
							"Google",
							"Indicação",
						].map((name) => (
							<option key={name}>{name}</option>
						))}
					</select>
				</label>
				<label>
					Tag exata
					<input
						name="tag"
						maxLength={32}
						defaultValue={tag}
						placeholder="Ex.: prioridade"
					/>
				</label>
				<button className="button secondary" type="submit">
					Aplicar filtros
				</button>
				{search || tag || source || status !== "all" ? (
					<Link href="/app/contacts" className="button secondary">
						Limpar
					</Link>
				) : null}
			</form>
			{canEdit ? (
				<details
					open={
						params.new === "1" ||
						(!allContacts.count && !search && !tag && !source)
					}
					id="new-contact"
					className={styles.newContactPanel}
				>
					<summary>
						<div>
							<strong>Adicionar lead</strong>
							<span>Crie o contato e sua oportunidade no funil.</span>
						</div>
						<Icon name="plus" />
					</summary>
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
				</details>
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
				<section className={`card table-wrap ${styles.contactsTable}`}>
					<table>
						<caption className="sr-only">
							Contatos do workspace com os filtros selecionados
						</caption>
						<thead>
							<tr>
								<th>Contato / empresa</th>
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
										<Link href={`/app/contacts/${contact.id}`}>
											<span className={styles.contactAvatar}>
												{contact.name.slice(0, 2).toUpperCase()}
											</span>
											<strong>{contact.name}</strong>
										</Link>
										{contact.company ? (
											<>
												<br />
												<span className="muted">{contact.company}</span>
											</>
										) : null}
										<br />
										<span className="muted">
											{contact.phone || contact.email || "Sem canal cadastrado"}
										</span>
									</td>
									<td>
										<span className={styles.sourceBadge}>
											<Icon
												name={
													contact.source === "WhatsApp" ? "inbox" : "target"
												}
											/>
											{contact.source || "Sem origem"}
										</span>
									</td>
									<td>
										<span
											className={`badge ${styles.contactStatus}`}
											data-status={contact.status}
										>
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
						{search || tag || source || status !== "all"
							? "Nenhum contato com esses filtros."
							: "Sua base de contatos começa aqui."}
					</strong>
					<p>
						{search || tag || source || status !== "all"
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
