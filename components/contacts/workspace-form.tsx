"use client";
import { useActionState, useState } from "react";
import { saveWorkspace } from "@/app/(protected)/app/settings/actions";
import { SubmitButton } from "@/components/app/submit-button";
import styles from "./profile.module.css";
export function WorkspaceForm({
	workspace,
	timezones,
}: {
	workspace: {
		name: string;
		segment: string | null;
		timezone: string;
		updated_at: string;
	};
	timezones: string[];
}) {
	const [draft, setDraft] = useState({
		name: workspace.name,
		segment: workspace.segment || "",
		timezone: workspace.timezone,
	});
	const [state, action, pending] = useActionState(saveWorkspace, {
		error: null,
	});
	return (
		<form action={action} className={styles.editForm}>
			<input
				type="hidden"
				name="expectedUpdatedAt"
				value={workspace.updated_at}
			/>
			{state.error ? (
				<p role="alert" className={styles.error}>
					{state.error}
				</p>
			) : null}
			<fieldset disabled={pending}>
				<legend className={styles.srOnly}>Configurações do workspace</legend>
				<label>
					Nome do workspace
					<input
						name="name"
						required
						minLength={2}
						maxLength={120}
						value={draft.name}
						onChange={(e) => setDraft({ ...draft, name: e.target.value })}
					/>
				</label>
				<label>
					Segmento
					<input
						name="segment"
						maxLength={160}
						value={draft.segment}
						onChange={(e) => setDraft({ ...draft, segment: e.target.value })}
						placeholder="Ex.: Consultoria"
					/>
				</label>
				<label className={styles.wide}>
					Fuso horário
					<select
						name="timezone"
						value={draft.timezone}
						onChange={(e) => setDraft({ ...draft, timezone: e.target.value })}
						aria-describedby="timezone-help"
					>
						{timezones.map((zone) => (
							<option key={zone} value={zone}>
								{zone.replaceAll("_", " ")}
							</option>
						))}
					</select>
				</label>
			</fieldset>
			<p id="timezone-help" className={styles.hint}>
				Novos prazos usam o fuso selecionado. Prazos já gravados mantêm seus
				instantes e passam a ser exibidos neste fuso.
			</p>
			<SubmitButton primary>Salvar configurações</SubmitButton>
		</form>
	);
}
