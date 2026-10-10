import Link from "next/link";
import { notFound } from "next/navigation";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/product";
import { uuidPattern } from "@/lib/workspace-selection";
import { statusLabels, stageLabels, priorityLabels } from "@/lib/operational";
import { activityLabels, type ContactContext } from "@/lib/contact-context";
import { ProfileForm, NoteForm } from "@/components/contacts/profile-form";
import { GrowthAssistant } from "@/components/contacts/growth-assistant";
import { crmSuggestion, focusDeal } from "@/lib/growth-ai";
import { growthAIConfigured } from "@/lib/growth-ai-provider";
import { getWorkspaceModules } from "@/lib/product";
import { workspaceDayBounds } from "@/lib/today-view";
import styles from "@/components/contacts/profile.module.css";

export default async function ContactPage({
	params,
	searchParams,
}: {
	params: Promise<{ contactId: string }>;
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const workspace = await requireModule("crm");
	const modules = await getWorkspaceModules(workspace.id);
	const { contactId } = await params;
	const query = await searchParams;
	if (!uuidPattern.test(contactId)) notFound();
	const page = Math.max(
		1,
		Math.min(10000, Math.trunc(Number(query.history)) || 1),
	);
	const supabase = await createClient();
	const { data, error } = await supabase.rpc("contact_context", {
		p_workspace_id: workspace.id,
		p_contact_id: contactId,
		p_history_page: page,
	});
	if (error) {
		if (error.code === "42501") notFound();
		throw new Error("Não foi possível carregar o perfil do contato.");
	}
	if (!data) notFound();
	const context = data as unknown as ContactContext;
	const { contact, stats } = context;
	const canEdit = workspace.role !== "viewer";
	const owner = context.members.find(
		(member) => member.id === contact.owner_user_id,
	);
	const formatDate = (value: string | null) =>
		value
			? new Intl.DateTimeFormat("pt-BR", {
					timeZone: workspace.timezone,
					dateStyle: "medium",
					timeStyle: "short",
				}).format(new Date(value))
			: "Sem registro";
	const currency = (value: number) =>
		new Intl.NumberFormat("pt-BR", {
			style: "currency",
			currency: "BRL",
		}).format(value);
	const success =
		query.saved === "profile"
			? "Perfil salvo."
			: query.saved === "note"
				? "Nota registrada no histórico."
				: "";
	const pages = Math.max(1, Math.ceil(stats.history / 30));
	const noteRequestId = randomUUID();
	const asOf = new Date().toISOString();
	return (
		<>
			<header className={styles.profileHero}>
				<div className={styles.identity}>
					<div className={styles.initials} aria-hidden="true">
						{contact.name.slice(0, 2).toLocaleUpperCase("pt-BR")}
					</div>
					<div>
						<span className={styles.kicker}>CRM · PERFIL DO CONTATO</span>
						<h1>{contact.name}</h1>
						<p>
							{contact.company || "Empresa não informada"} ·{" "}
							{statusLabels[contact.status]}
						</p>
					</div>
				</div>
				<div className={styles.heroActions}>
					{canEdit && !stats.tasks ? (
						<Link
							className="button secondary"
							href={`/app/start?contact=${contact.id}`}
						>
							Concluir primeiros passos
						</Link>
					) : null}
					<Link className="button secondary" href="/app/contacts">
						← Contatos
					</Link>
					{canEdit ? (
						<Link className="button" href={`/app/tasks?contact=${contact.id}`}>
							Criar próxima ação →
						</Link>
					) : null}
				</div>
			</header>
			{success ? (
				<p role="status" className={styles.success}>
					{success}
				</p>
			) : null}
			<nav className={styles.profileNav} aria-label="Seções do perfil">
				{modules.growth_ai.enabled ? <a href="#growth-ai">Growth AI</a> : null}
				<a href="#relacionamento">Relacionamento</a>
				<a href="#oportunidades">Oportunidades</a>
				<a href="#notas">Notas</a>
				<a href="#historico">Histórico</a>
				{canEdit ? <a href="#editar">Editar perfil</a> : null}
			</nav>
			<div className={styles.layout}>
				<div className={styles.column}>
					{modules.growth_ai.enabled ? (
						<GrowthAssistant
							contactId={contact.id}
							dealId={focusDeal(context)?.id || null}
							initial={crmSuggestion(context, asOf)}
							configured={growthAIConfigured()}
							canEdit={canEdit}
							openTaskId={
								context.tasks.find((task) => task.status === "open")?.id || null
							}
							day={workspaceDayBounds(asOf, workspace.timezone).day}
							historyCount={stats.history}
							shownHistory={context.history.length}
							timezone={workspace.timezone}
						/>
					) : null}
					<section id="relacionamento" className={styles.panel}>
						<h2>Contexto para o próximo passo.</h2>
						<p>Dados do contato e situação atual do acompanhamento.</p>
						<dl className={styles.facts}>
							<div>
								<dt>EMPRESA</dt>
								<dd>{contact.company || "Não informada"}</dd>
							</div>
							<div>
								<dt>RESPONSÁVEL</dt>
								<dd>
									{owner?.name ||
										(owner
											? `Membro ${owner.id.slice(-8)}`
											: contact.owner_user_id
												? "Responsável não disponível"
												: "Sem responsável")}
								</dd>
							</div>
							<div>
								<dt>E-MAIL</dt>
								<dd>{contact.email || "Não informado"}</dd>
							</div>
							<div>
								<dt>TELEFONE</dt>
								<dd>{contact.phone || "Não informado"}</dd>
							</div>
							<div>
								<dt>ORIGEM</dt>
								<dd>{contact.source}</dd>
							</div>
							<div>
								<dt>ÚLTIMA INTERAÇÃO</dt>
								<dd>{formatDate(contact.last_interaction_at)}</dd>
							</div>
							<div>
								<dt>CADASTRADO EM</dt>
								<dd>{formatDate(contact.created_at)}</dd>
							</div>
							<div>
								<dt>PERFIL ATUALIZADO EM</dt>
								<dd>{formatDate(contact.updated_at)}</dd>
							</div>
						</dl>
						{context.channels.length ? (
							<dl className={styles.facts}>
								{context.channels.map((channel) => (
									<div key={`${channel.channel}-${channel.address}`}>
										<dt>
											{channel.channel.toLocaleUpperCase("pt-BR")} VINCULADO
										</dt>
										<dd>{channel.address}</dd>
									</div>
								))}
							</dl>
						) : null}
						<section className={styles.tags} aria-label="Tags do contato">
							{contact.tags.length ? (
								contact.tags.map((tag) => <span key={tag}>{tag}</span>)
							) : (
								<small className="muted">Sem tags</small>
							)}
						</section>
						<div className={styles.metrics}>
							<div className={styles.metric}>
								<span>Oportunidades abertas</span>
								<strong>{stats.open_deals}</strong>
								<small>{currency(stats.pipeline)}</small>
							</div>
							<div className={styles.metric}>
								<span>Próximas ações</span>
								<strong>{stats.open_tasks}</strong>
								<small>{stats.overdue} atrasadas</small>
							</div>
							<div className={styles.metric}>
								<span>Conversas vinculadas</span>
								<strong>{stats.conversations}</strong>
								<small>{stats.notes} notas no histórico</small>
							</div>
						</div>
					</section>
					<section id="oportunidades" className={styles.panel}>
						<h2>Oportunidades</h2>
						<p>{stats.deals} no total · as abertas aparecem primeiro.</p>
						{context.deals.length ? (
							context.deals.map((deal) => (
								<Link
									key={deal.id}
									className={styles.record}
									href={`/app/pipeline?deal=${deal.id}#deal-${deal.id}`}
								>
									<div>
										<strong>{deal.title}</strong>
										<small>
											{stageLabels[deal.stage]} ·{" "}
											{formatDate(deal.last_activity_at)}
										</small>
									</div>
									<span className={styles.recordValue}>
										{currency(deal.value)} →
									</span>
								</Link>
							))
						) : (
							<div className={styles.empty}>
								Nenhuma oportunidade vinculada a este contato.
							</div>
						)}
						{stats.deals > context.deals.length ? (
							<p className={styles.hint}>
								Exibindo {context.deals.length} de {stats.deals} oportunidades.
							</p>
						) : null}
					</section>
					<section id="notas" className={styles.panel}>
						<h2>Notas do relacionamento</h2>
						<p>
							Registre o contexto que ajuda a equipe a retomar o atendimento.
						</p>
						{canEdit ? (
							<NoteForm
								key={noteRequestId}
								contactId={contact.id}
								requestId={noteRequestId}
							/>
						) : null}
						{context.notes.length ? (
							context.notes.map((note) => (
								<article className={styles.note} key={note.id}>
									<p>{note.text}</p>
									<small>
										{note.actor || "Equipe"} ·{" "}
										<time dateTime={note.created_at}>
											{formatDate(note.created_at)}
										</time>
									</small>
								</article>
							))
						) : (
							<div className={styles.empty}>
								Ainda não há notas para este contato.
							</div>
						)}
						{stats.notes > 5 ? (
							<p className={styles.hint}>
								Cinco notas mais recentes. As demais estão no{" "}
								<a href="#historico">histórico completo</a>.
							</p>
						) : null}
					</section>
					<section id="historico" className={styles.panel}>
						<h2>Histórico do contato</h2>
						<p>
							{stats.history} atividades relacionadas · página {page} de {pages}
							.
						</p>
						{context.history.length ? (
							<ol className={styles.history}>
								{context.history.map((event) => (
									<li key={event.id}>
										<strong>{activityLabels[event.type] || "Atividade"}</strong>
										<p>{event.text}</p>
										<small>
											{event.actor || "Equipe"} ·{" "}
											<time dateTime={event.created_at}>
												{formatDate(event.created_at)}
											</time>
										</small>
									</li>
								))}
							</ol>
						) : (
							<div className={styles.empty}>
								{page > 1
									? "Nenhuma atividade nesta página."
									: "As atividades deste contato aparecerão aqui."}
							</div>
						)}
						{pages > 1 || page > 1 ? (
							<nav
								className={styles.pagination}
								aria-label="Paginação do histórico"
							>
								{page > 1 ? (
									<Link
										href={`/app/contacts/${contact.id}?history=${page - 1}#historico`}
									>
										← Mais recentes
									</Link>
								) : (
									<span />
								)}
								<span>30 atividades por página</span>
								{page < pages ? (
									<Link
										href={`/app/contacts/${contact.id}?history=${page + 1}#historico`}
									>
										Mais antigas →
									</Link>
								) : (
									<span />
								)}
							</nav>
						) : null}
					</section>
				</div>
				<div className={styles.column}>
					<section className={styles.panel}>
						<h2>Próximas ações</h2>
						<p>{stats.tasks} tarefas vinculadas · abertas primeiro.</p>
						{context.tasks.length ? (
							context.tasks.map((task) => (
								<Link
									className={styles.record}
									key={task.id}
									href={`/app/tasks?status=all&task=${task.id}#task-${task.id}`}
								>
									<div>
										<strong>{task.title}</strong>
										<small>
											{task.status === "done"
												? "Concluída"
												: task.due_at && Date.parse(task.due_at) < Date.now()
													? "Atrasada"
													: "Aberta"}{" "}
											· {priorityLabels[task.priority]}
											<br />
											{task.due_at ? formatDate(task.due_at) : "Sem prazo"}
										</small>
									</div>
									<span aria-hidden="true">→</span>
								</Link>
							))
						) : (
							<div className={styles.empty}>
								Defina uma próxima ação para acompanhar este relacionamento.
							</div>
						)}
						{stats.tasks > context.tasks.length ? (
							<p className={styles.hint}>
								Exibindo {context.tasks.length} de {stats.tasks} tarefas.
							</p>
						) : null}
					</section>
					<section className={styles.panel}>
						<h2>Conversas</h2>
						<p>Conversas recentes, com acesso ao contexto no Inbox.</p>
						{context.conversations.length ? (
							context.conversations.map((conversation) => (
								<div key={conversation.id} className={styles.record}>
									<div>
										<strong>
											{conversation.channel === "whatsapp"
												? "WhatsApp"
												: conversation.channel}
										</strong>
										<small>
											{formatDate(conversation.last_message_at)} ·{" "}
											{conversation.unread_count} não lidas
										</small>
									</div>
									{conversation.channel === "whatsapp" ? (
										<Link
											className="button secondary"
											href={`/app/inbox?conversation=${conversation.id}`}
										>
											Abrir →
										</Link>
									) : null}
								</div>
							))
						) : (
							<div className={styles.empty}>
								Nenhuma conversa vinculada. O vínculo é criado quando o canal
								recebe uma mensagem.
							</div>
						)}
						{stats.conversations > context.conversations.length ? (
							<p className={styles.hint}>
								Exibindo {context.conversations.length} de {stats.conversations}{" "}
								conversas.
							</p>
						) : null}
					</section>
					{canEdit ? (
						<section id="editar" className={styles.panel}>
							<h2>Editar perfil</h2>
							<p>
								As alterações são registradas no histórico. Dados de outro
								workspace não podem ser vinculados.
							</p>
							<ProfileForm
								key={`${contact.id}-${contact.updated_at}`}
								contact={contact}
								members={context.members}
							/>
						</section>
					) : (
						<section className={styles.panel}>
							<h2>Perfil em modo de leitura</h2>
							<p>Seu papel permite consultar o contexto deste contato.</p>
						</section>
					)}
				</div>
			</div>
		</>
	);
}
