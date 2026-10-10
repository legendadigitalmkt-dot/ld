import { notFound } from "next/navigation";
import { requireWorkspace, isWorkspaceAdmin } from "@/lib/workspace";
import { mobilePreviewTarget, mobilePreviewWidth } from "@/lib/mobile-preview";
import styles from "./preview.module.css";

// Authenticated admin-only QA surface. Frames exercise real viewport media queries.
export default async function MobilePreview({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const workspace = await requireWorkspace();
	if (!isWorkspaceAdmin(workspace.role)) notFound();
	const params = await searchParams;
	const width = mobilePreviewWidth(params.width);
	const target = mobilePreviewTarget(params.screen, params.contact);
	return (
		<section className={styles.preview}>
			<h1>Conferência em tela móvel</h1>
			<p>
				Interface real do app em um viewport de {width}px. Esta visualização não
				simula o teclado, o navegador ou os gestos de um dispositivo físico.
			</p>
			<form method="get">
				<label>
					Largura
					<select name="width" defaultValue={String(width)}>
						<option value="360">360px</option>
						<option value="390">390px</option>
						<option value="430">430px</option>
					</select>
				</label>
				<label>
					Tela
					<select
						name="screen"
						defaultValue={
							typeof params.screen === "string" ? params.screen : "today"
						}
					>
						<option value="today">Hoje</option>
						<option value="start">Primeiros passos</option>
						<option value="pipeline">Kanban</option>
						<option value="contacts">Contatos</option>
						<option value="tasks">Tarefas</option>
						{params.screen === "contact" ? (
							<option value="contact">Perfil e Growth AI</option>
						) : null}
					</select>
				</label>
				{typeof params.contact === "string" ? (
					<input type="hidden" name="contact" value={params.contact} />
				) : null}
				<button className="button secondary" type="submit">
					Abrir visualização
				</button>
			</form>
			<div className={styles.frame} style={{ width }}>
				<iframe
					key={`${width}:${target}`}
					title="Growth OS em viewport móvel"
					src={target}
					height={820}
				/>
			</div>
		</section>
	);
}
