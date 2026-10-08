"use client";
import styles from "@/components/app/app.module.css";
export default function AppError({ reset }: { reset: () => void }) {
	return (
		<section className={styles.empty}>
			<strong>Não foi possível carregar esta área.</strong>
			<p>
				Tente novamente. Se sua sessão expirou, entre na conta para retomar a
				operação.
			</p>
			<button type="button" className={styles.submitButton} onClick={reset}>
				Tentar novamente
			</button>
		</section>
	);
}
