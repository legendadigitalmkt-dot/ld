"use client";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { generateContactReview } from "@/app/(protected)/app/contacts/[contactId]/ai-actions";
import { createTask } from "@/app/(protected)/app/tasks/actions";
import { SubmitButton } from "@/components/app/submit-button";
import { Icon } from "@/components/ui/icons";
import type { GrowthAIState, GrowthSuggestion } from "@/lib/growth-ai";
import styles from "./growth-assistant.module.css";

export function GrowthAssistant({
	contactId,
	dealId,
	initial,
	configured,
	canEdit,
	openTaskId,
	day,
	historyCount,
	shownHistory,
	timezone,
}: {
	contactId: string;
	dealId: string | null;
	initial: GrowthSuggestion;
	configured: boolean;
	canEdit: boolean;
	openTaskId: string | null;
	day: string;
	historyCount: number;
	shownHistory: number;
	timezone: string;
}) {
	const [state, action, pending] = useActionState(
		generateContactReview,
		{} as GrowthAIState,
	);
	const suggestion = state.result || initial;
	const [draft, setDraft] = useState(initial.draft);
	const [title, setTitle] = useState(initial.nextStep);
	const [copied, setCopied] = useState(false);
	const [copyError, setCopyError] = useState("");
	useEffect(() => {
		if (state.result) {
			setDraft(state.result.draft);
			setTitle(state.result.nextStep);
			setCopied(false);
		}
	}, [state.result]);
	async function copyDraft() {
		try {
			await navigator.clipboard.writeText(draft);
			setCopied(true);
			setCopyError("");
		} catch {
			setCopyError("Selecione o texto da mensagem e copie manualmente.");
		}
	}
	return (
		<section
			id="growth-ai"
			className={styles.assistant}
			aria-labelledby="growth-ai-title"
		>
			<div className={styles.header}>
				<div>
					<span className={styles.kicker}>GROWTH AI</span>
					<h2 id="growth-ai-title">Contexto antes da próxima ação.</h2>
				</div>
				<span className={styles.mode}>
					{state.result ? "Gerado com IA" : "Resumo do CRM"}
				</span>
			</div>
			<p className={styles.intro}>
				Reúna o histórico, avalie o próximo passo e revise a mensagem antes de
				usar.
			</p>
			<form action={action} className={styles.generate}>
				<input type="hidden" name="contactId" value={contactId} />
				<button
					className="button"
					type="submit"
					disabled={!configured || pending}
				>
					{pending
						? "Preparando revisão…"
						: configured
							? "Gerar revisão com IA"
							: "IA indisponível"}
				</button>
				<p>
					{configured
						? "Ao gerar, trechos recentes de notas, tarefas e mensagens são enviados à OpenAI. E-mails, telefones e links detectados são ocultados dos trechos; revise informações sensíveis no histórico."
						: "A geração por IA ainda não está configurada. O resumo e o rascunho do CRM continuam disponíveis."}
				</p>
			</form>
			{state.error ? (
				<p className="error" role="alert">
					{state.error}
				</p>
			) : null}
			<div className={styles.summary}>
				<span>
					{state.result ? "RESUMO PARA REVISÃO" : "SITUAÇÃO REGISTRADA NO CRM"}
				</span>
				<p>{suggestion.summary}</p>
			</div>
			<div className={styles.next}>
				<Icon name="target" />
				<div>
					<span>PRÓXIMO PASSO SUGERIDO</span>
					<strong>{suggestion.nextStep}</strong>
				</div>
			</div>
			<ul className={styles.questions}>
				{suggestion.questions.map((q) => (
					<li key={q}>{q}</li>
				))}
			</ul>
			<label className={styles.draft} htmlFor="growth-message-draft">
				Mensagem para revisão
				<textarea
					id="growth-message-draft"
					rows={5}
					maxLength={2000}
					value={draft}
					onChange={(e) => {
						setDraft(e.target.value);
						setCopied(false);
					}}
				/>
			</label>
			<div className={styles.actions}>
				<button
					className="button secondary"
					type="button"
					disabled={!draft.trim()}
					onClick={copyDraft}
				>
					{copied ? "Copiado" : "Copiar mensagem"}
				</button>
				<Link href="#historico">Conferir histórico →</Link>
			</div>
			<p role="status" className={styles.note}>
				{copied
					? "Mensagem copiada. Revise o destinatário e os dados antes de enviar."
					: copyError ||
						"Rascunho editável. Nenhuma mensagem é enviada por esta tela. No WhatsApp, respeite a janela de atendimento ou use um template aprovado."}
			</p>
			{openTaskId ? (
				<Link
					className="button secondary"
					href={`/app/tasks?task=${openTaskId}`}
				>
					Revisar a tarefa já aberta →
				</Link>
			) : canEdit ? (
				<details className={styles.plan}>
					<summary>Planejar uma tarefa com esse próximo passo</summary>
					<form action={createTask} className="stack">
						<input type="hidden" name="contactId" value={contactId} />
						<input type="hidden" name="dealId" value={dealId || ""} />
						<input type="hidden" name="returnTo" value="today" />
						<label>
							Tarefa
							<input
								name="title"
								required
								minLength={2}
								maxLength={180}
								value={title}
								onChange={(e) => setTitle(e.target.value)}
							/>
						</label>
						<div className={styles.planFields}>
							<label>
								Prioridade
								<select name="priority" defaultValue="medium">
									<option value="low">Baixa</option>
									<option value="medium">Média</option>
									<option value="high">Alta</option>
								</select>
							</label>
							<label>
								Prazo
								<input type="date" name="dueDate" defaultValue={day} />
							</label>
						</div>
						<small>
							Responsável: você. Prazo no fuso {timezone}. Confira as tarefas
							abertas antes de salvar.
						</small>
						<SubmitButton primary>Salvar tarefa</SubmitButton>
					</form>
				</details>
			) : null}
			<p className={styles.note}>
				{shownHistory} de {historyCount} eventos recentes nesta consulta. A IA
				usa até 10 eventos, 5 notas, 8 mensagens das conversas recentes e 8
				oportunidades/tarefas. Confira o histórico completo antes de decidir.
				{state.generatedAt
					? " A geração corresponde ao contexto consultado naquele momento."
					: ""}
			</p>
		</section>
	);
}
