import {
	usageLabels,
	usageResources,
	usageState,
	type WorkspaceUsage,
} from "@/lib/plans-view";
import styles from "./control.module.css";
export function UsageCards({ usage }: { usage: WorkspaceUsage }) {
	return (
		<div className={styles.usageGrid}>
			{usageResources.map((key) => {
				const count = usage.used[key],
					limit = usage.limits[key],
					reserved = key === "members" ? usage.reserved_members : 0,
					state = usageState(count + reserved, limit);
				return (
					<article className={styles.usageCard} key={key} data-usage={state}>
						<h3>{usageLabels[key]}</h3>
						<strong>{count.toLocaleString("pt-BR")}</strong>
						<span>
							{limit === null
								? "Sem teto configurado"
								: `de ${limit.toLocaleString("pt-BR")}`}
						</span>
						{limit !== null ? (
							<meter
								min={0}
								max={Math.max(limit, 1)}
								value={Math.min(count + reserved, Math.max(limit, 1))}
								aria-label={`${usageLabels[key]}: ${count} de ${limit}`}
							/>
						) : null}
						{reserved > 0 ? (
							<p>{reserved} vaga(s) reservada(s) para convites em andamento</p>
						) : null}
						<p>
							{state === "over"
								? "Acima do limite · dados preservados"
								: state === "full"
									? "Limite atingido"
									: state === "available"
										? "Capacidade disponível"
										: "Política atual de uso"}
						</p>
					</article>
				);
			})}
		</div>
	);
}
