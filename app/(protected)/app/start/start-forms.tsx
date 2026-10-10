"use client";
import { useActionState } from "react";
import {
	createActivationLead,
	createActivationOpportunity,
	createActivationTask,
} from "./actions";
import { SubmitButton } from "@/components/app/submit-button";
import type { ActivationState } from "@/lib/activation";
import styles from "./start.module.css";

export function ActivationLeadForm({ intakeKey }: { intakeKey: string }) {
	const [state, action] = useActionState(
		createActivationLead,
		{} as ActivationState,
	);
	return (
		<form action={action} className="stack">
			<input type="hidden" name="intakeKey" value={intakeKey} />
			<label>
				Nome do contato
				<input
					name="name"
					required
					minLength={2}
					maxLength={160}
					autoComplete="name"
					placeholder="Quem você quer acompanhar?"
				/>
			</label>
			<div className={styles.fields}>
				<label>
					Telefone (opcional)
					<input
						name="phone"
						type="tel"
						inputMode="tel"
						autoComplete="tel"
						maxLength={40}
						placeholder="+55 (DDD) número"
					/>
				</label>
				<label>
					Origem
					<select name="source" defaultValue="Manual">
						{[
							"Manual",
							"WhatsApp",
							"Instagram",
							"Meta Ads",
							"Google",
							"Indicação",
						].map((s) => (
							<option key={s}>{s}</option>
						))}
					</select>
				</label>
			</div>
			<p className={styles.hint}>
				Ao cadastrar, uma oportunidade também será criada em Novo lead. O
				telefone não dispara mensagens.
			</p>
			{state.error ? (
				<p role="alert" className="error">
					{state.error}
				</p>
			) : null}
			<SubmitButton primary>Criar contato e oportunidade</SubmitButton>
		</form>
	);
}
export function ActivationOpportunityForm({
	contactId,
	name,
}: {
	contactId: string;
	name: string;
}) {
	const [state, action] = useActionState(
		createActivationOpportunity,
		{} as ActivationState,
	);
	return (
		<form action={action} className="stack">
			<input type="hidden" name="contactId" value={contactId} />
			<label>
				Título da oportunidade
				<input
					name="title"
					required
					minLength={2}
					maxLength={180}
					defaultValue={`Oportunidade · ${name}`.slice(0, 180)}
				/>
			</label>
			<label>
				Valor estimado (R$)
				<input
					name="value"
					inputMode="decimal"
					defaultValue="0,00"
					required
					maxLength={20}
				/>
			</label>
			<p className={styles.hint}>
				Comece com zero se o valor ainda não estiver definido. A oportunidade
				ficará em Novo lead.
			</p>
			{state.error ? (
				<p role="alert" className="error">
					{state.error}
				</p>
			) : null}
			<SubmitButton primary>Criar oportunidade</SubmitButton>
		</form>
	);
}
export function ActivationTaskForm({
	contactId,
	dealId,
	name,
	day,
	timezone,
}: {
	contactId: string;
	dealId: string;
	name: string;
	day: string;
	timezone: string;
}) {
	const [state, action] = useActionState(
		createActivationTask,
		{} as ActivationState,
	);
	return (
		<form action={action} className="stack">
			<input type="hidden" name="contactId" value={contactId} />
			<input type="hidden" name="dealId" value={dealId} />
			<label>
				Qual será o próximo passo?
				<input
					name="title"
					required
					minLength={2}
					maxLength={180}
					defaultValue={`Definir próximo passo com ${name}`.slice(0, 180)}
				/>
			</label>
			<div className={styles.fields}>
				<label>
					Prazo
					<input type="date" name="dueDate" required defaultValue={day} />
				</label>
				<label>
					Prioridade
					<select name="priority" defaultValue="medium">
						<option value="low">Baixa</option>
						<option value="medium">Média</option>
						<option value="high">Alta</option>
					</select>
				</label>
			</div>
			<p className={styles.hint}>
				A tarefa será vinculada ao contato e à oportunidade. Você será o
				responsável; o prazo usa {timezone}.
			</p>
			{state.error ? (
				<p role="alert" className="error">
					{state.error}
				</p>
			) : null}
			<SubmitButton primary>Salvar primeira tarefa</SubmitButton>
		</form>
	);
}
