import Link from "next/link";
import styles from "./control.module.css";
export function ControlFilter({
	query,
	status,
	base,
	placeholder = "Nome, e-mail ou ID",
	children,
}: {
	query: string;
	status?: string;
	base: string;
	placeholder?: string;
	children?: React.ReactNode;
}) {
	return (
		<form className={styles.filters} action={base}>
			<label>
				Buscar
				<input
					type="search"
					name="q"
					defaultValue={query}
					maxLength={80}
					placeholder={placeholder}
				/>
			</label>
			{status ? (
				<label>
					Status
					<select name="status" defaultValue={status}>
						<option value="all">Todos</option>
						<option value="active">Ativos</option>
						<option value="suspended">Suspensos</option>
					</select>
				</label>
			) : null}
			{children}
			<button type="submit" className={styles.button}>
				Filtrar
			</button>
			<Link href={base}>Limpar</Link>
		</form>
	);
}
