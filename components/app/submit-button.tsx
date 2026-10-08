"use client";
import { useFormStatus } from "react-dom";
import styles from "./app.module.css";
export function SubmitButton({
	children,
	primary = false,
}: {
	children: React.ReactNode;
	primary?: boolean;
}) {
	const { pending } = useFormStatus();
	return (
		<button
			type="submit"
			className={primary ? "button" : styles.submitButton}
			disabled={pending}
		>
			{pending ? "Salvando..." : children}
		</button>
	);
}
