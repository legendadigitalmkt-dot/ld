"use client";
import { useActionState, useState } from "react";
import {
	saveContact,
	addNote,
} from "@/app/(protected)/app/contacts/[contactId]/actions";
import { SubmitButton } from "@/components/app/submit-button";
import type { ContactContext } from "@/lib/contact-context";
import type { ContactDraft } from "@/lib/contact-input";
import { roleLabels } from "@/lib/operational";
import styles from "./profile.module.css";

export function ProfileForm({
	contact,
	members,
}: {
	contact: ContactContext["contact"];
	members: ContactContext["members"];
}) {
	const initial: ContactDraft = {
		name: contact.name,
		company: contact.company || "",
		email: contact.email || "",
		phone: contact.phone || "",
		source: contact.source,
		status: contact.status,
		tags: contact.tags.join(", "),
		owner: contact.owner_user_id || "",
	};
	const [draft, setDraft] = useState(initial);
	const [state, action, pending] = useActionState(saveContact, { error: null });
	const change = (key: keyof ContactDraft, value: string) =>
		setDraft((current) => ({ ...current, [key]: value }));
	return (
		<form action={action} className={styles.editForm}>
			<input type="hidden" name="contactId" value={contact.id} />
			<input
				type="hidden"
				name="expectedUpdatedAt"
				value={contact.updated_at}
			/>
			{state.error ? (
				<p role="alert" className={styles.error}>
					{state.error}
				</p>
			) : null}
			<fieldset disabled={pending}>
				<legend className={styles.srOnly}>Dados do contato</legend>
				<label>
					Nome
					<input
						name="name"
						required
						minLength={2}
						maxLength={160}
						value={draft.name}
						onChange={(e) => change("name", e.target.value)}
						autoComplete="name"
					/>
				</label>
				<label>
					Empresa
					<input
						name="company"
						maxLength={160}
						value={draft.company}
						onChange={(e) => change("company", e.target.value)}
						autoComplete="organization"
						placeholder="Empresa ou organização"
					/>
				</label>
				<label>
					E-mail
					<input
						name="email"
						type="email"
						maxLength={254}
						value={draft.email}
						onChange={(e) => change("email", e.target.value)}
						autoComplete="email"
					/>
				</label>
				<label>
					Telefone
					<input
						name="phone"
						type="tel"
						maxLength={40}
						value={draft.phone}
						onChange={(e) => change("phone", e.target.value)}
						autoComplete="tel"
					/>
				</label>
				<label>
					Origem
					<input
						name="source"
						required
						maxLength={80}
						value={draft.source}
						onChange={(e) => change("source", e.target.value)}
						placeholder="Ex.: Indicação"
					/>
				</label>
				<label>
					Status
					<select
						name="status"
						value={draft.status}
						onChange={(e) => change("status", e.target.value)}
					>
						<option value="lead">Lead</option>
						<option value="customer">Cliente</option>
						<option value="inactive">Inativo</option>
					</select>
				</label>
				<label className={styles.wide}>
					Responsável
					<select
						name="owner"
						value={draft.owner}
						onChange={(e) => change("owner", e.target.value)}
					>
						<option value="">Sem responsável</option>
						{draft.owner && !members.some((m) => m.id === draft.owner) ? (
							<option value={draft.owner}>
								Responsável fora do workspace — escolha outro
							</option>
						) : null}
						{members.map((member) => (
							<option key={member.id} value={member.id}>
								{member.name || `Membro ${member.id.slice(-8)}`} ·{" "}
								{roleLabels[member.role] || member.role}
							</option>
						))}
					</select>
				</label>
				<label className={styles.wide}>
					Tags
					<input
						name="tags"
						maxLength={400}
						value={draft.tags}
						onChange={(e) => change("tags", e.target.value)}
						placeholder="Ex.: prioridade, indicação"
						aria-describedby="contact-tags-help"
					/>
					<small id="contact-tags-help">
						Separe por vírgulas. Até 10 tags de 32 caracteres; repetições são
						removidas.
					</small>
				</label>
			</fieldset>
			<p className={styles.hint}>
				O telefone do perfil não altera o número das conversas WhatsApp já
				vinculadas.
			</p>
			<div className={styles.formActions}>
				<SubmitButton primary>Salvar perfil</SubmitButton>
				<button
					type="button"
					className="button secondary"
					disabled={pending}
					onClick={() => setDraft(initial)}
				>
					Descartar alterações
				</button>
			</div>
			<span role="status" className={styles.srOnly}>
				{pending ? "Salvando perfil..." : ""}
			</span>
		</form>
	);
}

export function NoteForm({
	contactId,
	requestId,
}: {
	contactId: string;
	requestId: string;
}) {
	const [body, setBody] = useState("");
	const [state, action, pending] = useActionState(addNote, { error: null });
	return (
		<form action={action} className={styles.noteForm}>
			<input type="hidden" name="contactId" value={contactId} />
			<input type="hidden" name="requestId" value={requestId} />
			<label htmlFor="contact-note">
				Adicionar nota
				<textarea
					id="contact-note"
					name="body"
					required
					minLength={2}
					maxLength={4000}
					rows={4}
					value={body}
					onChange={(e) => setBody(e.target.value)}
					disabled={pending}
					placeholder="Contexto da conversa, necessidades ou próximos passos..."
				/>
			</label>
			{state.error ? (
				<p role="alert" className={styles.error}>
					{state.error}
				</p>
			) : null}
			<div className={styles.formActions}>
				<SubmitButton>Registrar nota</SubmitButton>
				<small>{body.length}/4.000</small>
			</div>
			<p className={styles.hint}>
				A nota fica no histórico do contato e pode ser lida pela equipe deste
				workspace.
			</p>
		</form>
	);
}
