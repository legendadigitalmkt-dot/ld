"use client";
import { useActionState, useId } from "react";
import type { AdminActionState } from "@/lib/control-view";
import styles from "./control.module.css";
export function AdminActionForm({
	action,
	children,
	label,
	danger = false,
}: {
	action: (
		previous: AdminActionState,
		form: FormData,
	) => Promise<AdminActionState>;
	children: React.ReactNode;
	label: string;
	danger?: boolean;
}) {
	const [state, submit, pending] = useActionState(action, {});
	const id = useId();
	return (
		<form action={submit} className={styles.actionForm}>
			{children}
			<label htmlFor={`${id}-reason`}>
				Motivo da ação
				<textarea
					id={`${id}-reason`}
					name="reason"
					minLength={10}
					maxLength={500}
					required
					rows={3}
					placeholder="Explique a necessidade. Não inclua credenciais."
				/>
			</label>
			<label className={styles.confirmation}>
				<input type="checkbox" name="confirmation" value="confirm" required />
				Confirmo esta alteração e seu registro na auditoria.
			</label>
			{state.error ? (
				<p role="alert" className={styles.error}>
					{state.error}
				</p>
			) : null}
			{state.message ? (
				<p role="status" className={styles.success}>
					{state.message}
				</p>
			) : null}
			<button
				type="submit"
				className={danger ? styles.dangerButton : styles.button}
				disabled={pending || Boolean(state.message)}
			>
				{pending ? "Salvando…" : label}
			</button>
		</form>
	);
}
