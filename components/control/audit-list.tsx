import { ControlTime } from "./ui";
import type { AdminAudit } from "@/lib/control-view";
import styles from "./control.module.css";
export function AuditList({
	items,
	timezone,
}: {
	items: AdminAudit[];
	timezone?: string;
}) {
	return items.length ? (
		<div className={styles.auditList}>
			{items.map((item) => (
				<article key={item.id}>
					<div className={styles.rowHeading}>
						<strong>{item.action}</strong>
						<small>
							<ControlTime value={item.created_at} timezone={timezone} />
						</small>
					</div>
					<p>
						{item.actor ??
							(item.actor_type === "system"
								? "Operação de infraestrutura"
								: (item.actor_id ?? "Administrador"))}{" "}
						· {item.entity_type}
					</p>
					<details>
						<summary>Ver motivo e alteração</summary>
						<dl className={styles.facts}>
							<div>
								<dt>ID da entidade</dt>
								<dd>{item.entity_id ?? "Consulta geral"}</dd>
							</div>
							<div>
								<dt>Motivo</dt>
								<dd>{item.reason}</dd>
							</div>
							<div>
								<dt>Registro</dt>
								<dd>{item.id}</dd>
							</div>
						</dl>
						{item.before || item.after ? (
							<div className={styles.changes}>
								<div>
									<strong>Antes</strong>
									<pre>{JSON.stringify(item.before, null, 2)}</pre>
								</div>
								<div>
									<strong>Depois</strong>
									<pre>{JSON.stringify(item.after, null, 2)}</pre>
								</div>
							</div>
						) : null}
					</details>
				</article>
			))}
		</div>
	) : (
		<p className={styles.empty}>Nenhum registro encontrado.</p>
	);
}
