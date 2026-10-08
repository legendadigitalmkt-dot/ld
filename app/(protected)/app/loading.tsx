import styles from "@/components/app/app.module.css";
export default function AppLoading() {
	return (
		<div role="status" aria-label="Carregando a operação">
			<p className={styles.resultCount}>Carregando sua operação...</p>
			<div className={styles.metricGrid}>
				{["leads", "pipeline", "ganhos", "conversao"].map((key) => (
					<div key={key} className={styles.skeleton} />
				))}
			</div>
			<div className={styles.dashboardGrid}>
				<div className={styles.skeleton} style={{ height: 280 }} />
				<div className={styles.skeleton} style={{ height: 280 }} />
			</div>
		</div>
	);
}
