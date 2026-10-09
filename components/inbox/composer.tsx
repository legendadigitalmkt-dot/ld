"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
	sendInboxMessage,
	sendInboxTemplate,
} from "@/app/(protected)/app/inbox/actions";
import { whatsappServiceWindow } from "@/lib/meta/whatsapp-policy";
import {
	renderTemplate,
	type WhatsAppTemplate,
} from "@/lib/meta/whatsapp-templates";

export type InboxSendState = {
	error?: string;
	accepted?: boolean;
	sentMessageId?: string;
};

export function InboxLiveRefresh() {
	const router = useRouter();
	useEffect(() => {
		const refresh = () => {
			if (document.visibilityState === "visible") router.refresh();
		};
		const interval = window.setInterval(refresh, 15000);
		window.addEventListener("focus", refresh);
		return () => {
			window.clearInterval(interval);
			window.removeEventListener("focus", refresh);
		};
	}, [router]);
	return (
		<span className="muted inbox-live">
			Mensagens e status atualizados a cada 15 segundos
		</span>
	);
}

export function InboxComposer({
	conversationId,
	lastInboundAt,
	initialNow,
	timezone,
	connected,
	templates,
	templateError,
}: {
	conversationId: string;
	lastInboundAt: string | null;
	initialNow: number;
	timezone: string;
	connected: boolean;
	templates: WhatsAppTemplate[];
	templateError: string | null;
}) {
	const [now, setNow] = useState(initialNow);
	const windowState = whatsappServiceWindow(lastInboundAt, now);
	const [mode, setMode] = useState<"text" | "template">(
		whatsappServiceWindow(lastInboundAt, initialNow).open ? "text" : "template",
	);
	const [templateId, setTemplateId] = useState(
		templates.find((item) => !item.unsupportedReason)?.id || "",
	);
	const [values, setValues] = useState<Record<string, string>>({});
	const [draft, setDraft] = useState("");
	const router = useRouter();
	const [textState, textAction, textPending] = useActionState(
		sendInboxMessage,
		{},
	);
	const [templateState, templateAction, templatePending] = useActionState(
		sendInboxTemplate,
		{},
	);
	const pending = textPending || templatePending;
	const accepted = textState.accepted || templateState.accepted;
	const selected = templates.find((item) => item.id === templateId);
	useEffect(() => {
		if (textState.sentMessageId) {
			setDraft("");
			router.refresh();
		}
	}, [textState.sentMessageId, router]);
	useEffect(() => {
		if (templateState.sentMessageId) router.refresh();
	}, [templateState.sentMessageId, router]);
	useEffect(() => {
		const tick = window.setInterval(() => setNow(Date.now()), 1000);
		return () => window.clearInterval(tick);
	}, []);
	const expires = windowState.expiresAt
		? new Intl.DateTimeFormat("pt-BR", {
				timeZone: timezone,
				day: "2-digit",
				month: "2-digit",
				hour: "2-digit",
				minute: "2-digit",
			}).format(new Date(windowState.expiresAt))
		: null;

	return (
		<div className="whatsapp-composer">
			<div className={`service-window ${windowState.open ? "open" : "closed"}`}>
				<strong>
					{windowState.open
						? "Janela de atendimento aberta"
						: "Janela de atendimento fechada"}
				</strong>
				<p>
					{windowState.open
						? `Você pode enviar texto até ${expires} (${timezone}).`
						: expires
							? `A janela terminou em ${expires} (${timezone}). Envie um template aprovado ou aguarde uma nova mensagem do contato.`
							: "Nenhuma mensagem recebida abre a janela de 24 horas. Use um template aprovado para iniciar o contato."}
				</p>
				<small>
					O envio de um template só reabre a janela quando o contato responde.
				</small>
			</div>
			{!connected ? (
				<p className="error">
					O canal WhatsApp está desconectado. Peça a um administrador para
					configurar a integração.
				</p>
			) : null}
			<fieldset className="composer-tabs" aria-label="Tipo de mensagem">
				<button
					type="button"
					className={`button secondary ${mode === "text" ? "selected" : ""}`}
					disabled={pending}
					onClick={() => setMode("text")}
				>
					Texto
				</button>
				<button
					type="button"
					className={`button secondary ${mode === "template" ? "selected" : ""}`}
					disabled={pending}
					onClick={() => setMode("template")}
				>
					Template aprovado
				</button>
			</fieldset>
			<form action={textAction} className="stack" hidden={mode !== "text"}>
				<input type="hidden" name="conversationId" value={conversationId} />
				<label>
					Mensagem de texto
					<textarea
						name="body"
						required
						maxLength={4096}
						rows={3}
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						placeholder="Digite uma mensagem..."
						disabled={!connected || !windowState.open || pending || accepted}
					/>
				</label>
				{textState.error ? (
					<p className="error" role="alert">
						{textState.error}
					</p>
				) : null}
				<button
					className="button"
					type="submit"
					disabled={!connected || !windowState.open || pending || accepted}
				>
					{textPending ? "Solicitando envio..." : "Enviar texto"}
				</button>
			</form>
			<form
				action={templateAction}
				className="stack"
				hidden={mode !== "template"}
			>
				<input type="hidden" name="conversationId" value={conversationId} />
				{templateError ? (
					<p className="error" role="alert">
						{templateError}
					</p>
				) : null}
				{!templateError && !templates.length ? (
					<p className="muted">
						Nenhum template aprovado foi retornado pela WABA. Um administrador
						deve criar e aprovar um template na Meta e atualizar esta página.
					</p>
				) : null}
				<label>
					Template e idioma
					<select
						name="templateId"
						required
						value={templateId}
						disabled={pending || !connected || accepted}
						onChange={(event) => {
							setTemplateId(event.target.value);
							setValues({});
						}}
					>
						<option value="">Selecione um template aprovado</option>
						{templates.map((item) => (
							<option
								key={item.id}
								value={item.id}
								disabled={Boolean(item.unsupportedReason)}
							>
								{item.name} · {item.language}
								{item.unsupportedReason ? " · incompatível" : ""}
							</option>
						))}
					</select>
				</label>
				{selected?.variables.map((variable) => (
					<label key={`${templateId}_${variable.field}`}>
						{variable.component === "header" ? "Cabeçalho" : "Mensagem"} ·{" "}
						{`{{${variable.key}}}`}
						<input
							name={variable.field}
							required
							maxLength={variable.component === "header" ? 60 : 1024}
							value={values[variable.field] || ""}
							disabled={pending || accepted}
							onChange={(event) =>
								setValues((current) => ({
									...current,
									[variable.field]: event.target.value,
								}))
							}
						/>
					</label>
				))}
				{selected ? (
					<div className="template-preview">
						<span className="muted">Prévia · {selected.language}</span>
						<p>{renderTemplate(selected, values)}</p>
					</div>
				) : null}
				{templates.some((item) => item.unsupportedReason) ? (
					<p className="muted">
						Templates com mídia, botões ou autenticação ficam indisponíveis
						nesta versão do Inbox.
					</p>
				) : null}
				{templateState.error ? (
					<p className="error" role="alert">
						{templateState.error}
					</p>
				) : null}
				<button
					className="button"
					type="submit"
					disabled={
						!connected ||
						!selected ||
						Boolean(selected.unsupportedReason) ||
						pending ||
						accepted
					}
				>
					{templatePending ? "Solicitando envio..." : "Enviar template"}
				</button>
			</form>
		</div>
	);
}
