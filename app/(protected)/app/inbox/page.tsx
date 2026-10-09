import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/lib/workspace";
import { sendInboxMessage } from "./actions";
import { uuidPattern } from "@/lib/workspace-selection";

function formatTime(value: string | null, timezone: string) {
	if (!value) return "—";
	return new Intl.DateTimeFormat("pt-BR", {
		timeZone: timezone,
		day: "2-digit",
		month: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(value));
}

export default async function InboxPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const workspace = await requireWorkspace();
	const params = await searchParams;
	const requestedConversation =
		typeof params.conversation === "string" ? params.conversation : null;
	const errorMessage = typeof params.error === "string" ? params.error : null;

	const supabase = await createClient();
	const { data: conversations, error } = await supabase
		.from("conversations")
		.select(
			"id,contact_id,channel,external_thread_id,status,unread_count,last_message_at",
		)
		.eq("workspace_id", workspace.id)
		.eq("channel", "whatsapp")
		.order("last_message_at", { ascending: false })
		.limit(100);

	if (error) throw new Error("Não foi possível carregar o Inbox.");
	let visibleConversations = conversations || [];
	if (
		requestedConversation &&
		uuidPattern.test(requestedConversation) &&
		!visibleConversations.some((item) => item.id === requestedConversation)
	) {
		const { data: requested, error: requestedError } = await supabase
			.from("conversations")
			.select(
				"id,contact_id,channel,external_thread_id,status,unread_count,last_message_at",
			)
			.eq("workspace_id", workspace.id)
			.eq("channel", "whatsapp")
			.eq("id", requestedConversation)
			.maybeSingle();
		if (requestedError)
			throw new Error("Não foi possível carregar a conversa selecionada.");
		if (requested) visibleConversations = [requested, ...visibleConversations];
	}

	const contactIds = [
		...new Set(visibleConversations.map((item) => item.contact_id)),
	];
	const { data: contacts, error: contactsError } = contactIds.length
		? await supabase
				.from("contacts")
				.select("id,name,phone,status,source")
				.eq("workspace_id", workspace.id)
				.in("id", contactIds)
		: { data: [], error: null };
	if (contactsError)
		throw new Error("Não foi possível carregar os contatos do Inbox.");

	const contactMap = new Map(
		(contacts || []).map((contact) => [contact.id, contact]),
	);
	const selectedId = requestedConversation
		? visibleConversations.find((item) => item.id === requestedConversation)
				?.id || null
		: visibleConversations[0]?.id || null;

	const selected =
		visibleConversations.find((item) => item.id === selectedId) || null;
	const selectedContact = selected ? contactMap.get(selected.contact_id) : null;

	const {
		data: messages,
		error: messagesError,
		count: messageCount,
	} = selectedId
		? await supabase
				.from("messages")
				.select(
					"id,direction,author_name,body,message_type,delivery_status,error_message,sent_at,external_message_id",
					{ count: "exact" },
				)
				.eq("workspace_id", workspace.id)
				.eq("conversation_id", selectedId)
				.order("sent_at", { ascending: false })
				.order("id", { ascending: false })
				.limit(300)
		: { data: [], error: null, count: 0 };

	if (messagesError) throw new Error("Não foi possível carregar as mensagens.");

	return (
		<>
			<div className="section-head">
				<div>
					<div className="brand">INBOX</div>
					<h1 style={{ marginTop: 8 }}>WhatsApp</h1>
					<p className="muted">
						Conversas persistidas diretamente da WhatsApp Cloud API.
					</p>
				</div>
				<Link href="/app/settings/integrations" className="button secondary">
					Configurar canal
				</Link>
			</div>

			{errorMessage ? <p className="error">{errorMessage}</p> : null}
			{requestedConversation && !selected ? (
				<p className="error">
					Essa conversa não está disponível no workspace atual.{" "}
					<Link href="/app/inbox">Ver conversas disponíveis →</Link>
				</p>
			) : null}

			<div className="inbox-grid">
				<aside className="card inbox-list">
					{visibleConversations.length === 0 ? (
						<p className="muted">Nenhuma conversa recebida ainda.</p>
					) : (
						visibleConversations.map((conversation) => {
							const contact = contactMap.get(conversation.contact_id);
							const active = conversation.id === selectedId;
							return (
								<Link
									key={conversation.id}
									href={`/app/inbox?conversation=${conversation.id}`}
									className={`inbox-thread ${active ? "active" : ""}`}
								>
									<div>
										<strong>
											{contact?.name ||
												conversation.external_thread_id ||
												"Contato"}
										</strong>
										<span className="muted">
											{contact?.phone || conversation.external_thread_id}
										</span>
									</div>
									<div className="inbox-thread-meta">
										<small>
											{formatTime(
												conversation.last_message_at,
												workspace.timezone,
											)}
										</small>
										{conversation.unread_count > 0 ? (
											<span className="unread-pill">
												{conversation.unread_count}
											</span>
										) : null}
									</div>
								</Link>
							);
						})
					)}
				</aside>

				<section className="card inbox-conversation">
					{selected ? (
						<>
							<header className="inbox-header">
								<div>
									{selectedContact ? (
										<Link href={`/app/contacts/${selectedContact.id}`}>
											<strong>{selectedContact.name} · Abrir perfil →</strong>
										</Link>
									) : (
										<strong>{selected.external_thread_id}</strong>
									)}
									<div className="muted">
										{selectedContact?.phone || selected.external_thread_id} ·{" "}
										{selectedContact?.status || "lead"}
									</div>
								</div>
								<span className="badge">WhatsApp</span>
							</header>

							<div className="message-stream">
								{[...(messages || [])].reverse().map((message) => (
									<article
										key={message.id}
										className={`message-bubble ${message.direction === "out" ? "out" : "in"}`}
									>
										<div>{message.body}</div>
										<footer>
											<span>
												{formatTime(message.sent_at, workspace.timezone)}
											</span>
											{message.direction === "out" ? (
												<span title={message.error_message || undefined}>
													{message.delivery_status || "pending"}
												</span>
											) : null}
										</footer>
									</article>
								))}
							</div>
							{(messageCount || 0) > 300 ? (
								<p className="muted">
									Exibindo as 300 mensagens mais recentes de {messageCount}.
								</p>
							) : null}

							{workspace.role !== "viewer" ? (
								<form action={sendInboxMessage} className="inbox-composer">
									<input
										type="hidden"
										name="conversationId"
										value={selected.id}
									/>
									<textarea
										name="body"
										required
										maxLength={4096}
										placeholder="Digite uma mensagem..."
										rows={3}
									/>
									<button className="button" type="submit">
										Enviar
									</button>
								</form>
							) : null}
						</>
					) : (
						<div className="empty-state">
							<h2>Inbox pronto</h2>
							<p className="muted">
								Quando a Meta entregar a primeira mensagem, o contato e a
								oportunidade serão criados automaticamente.
							</p>
						</div>
					)}
				</section>
			</div>
		</>
	);
}
