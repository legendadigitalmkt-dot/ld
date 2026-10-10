import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icons";
import styles from "./control.module.css";
export function ControlHeading({
	eyebrow,
	title,
	description,
}: {
	eyebrow: string;
	title: string;
	description: string;
}) {
	return (
		<header className={styles.heading}>
			<span>{eyebrow}</span>
			<h1>{title}</h1>
			<p>{description}</p>
		</header>
	);
}
export function ControlMetric({
	label,
	value,
	note,
	icon,
}: {
	label: string;
	value: number | string;
	note: string;
	icon: IconName;
}) {
	return (
		<article className={styles.metric}>
			<span>
				<Icon name={icon} />
				{label}
			</span>
			<strong>
				{typeof value === "number" ? value.toLocaleString("pt-BR") : value}
			</strong>
			<small>{note}</small>
		</article>
	);
}
export function ControlTime({
	value,
	timezone = "America/Sao_Paulo",
}: {
	value: string | null;
	timezone?: string;
}) {
	return (
		<>
			{value
				? new Intl.DateTimeFormat("pt-BR", {
						dateStyle: "short",
						timeStyle: "short",
						timeZone: timezone,
					}).format(new Date(value))
				: "Sem registro"}
		</>
	);
}
export function Pagination({
	base,
	page,
	total,
	size,
	query,
	status,
}: {
	base: string;
	page: number;
	total: number;
	size: number;
	query: string;
	status?: string;
}) {
	const pages = Math.max(1, Math.ceil(total / size));
	const url = (p: number) =>
		`${base}?${new URLSearchParams({ page: String(p), q: query, ...(status ? { status } : {}) })}`;
	return (
		<nav className={styles.pagination} aria-label="Paginação">
			<span>
				{total.toLocaleString("pt-BR")} registros · página {page} de {pages}
			</span>
			<div>
				{page > 1 ? <Link href={url(page - 1)}>← Anterior</Link> : null}
				{page < pages ? <Link href={url(page + 1)}>Próxima →</Link> : null}
			</div>
		</nav>
	);
}
export function StatusBadge({ status }: { status: string }) {
	return (
		<span className={styles.status} data-status={status}>
			{status === "suspended"
				? "Suspenso"
				: status === "active"
					? "Ativo"
					: status}
		</span>
	);
}
