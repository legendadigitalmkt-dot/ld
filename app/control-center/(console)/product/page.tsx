import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformPermission } from "@/lib/control";
import { adminUUID } from "@/lib/control-view";
import {
	moduleSourceLabels,
	moduleStateLabels,
	type ProductCatalog,
} from "@/lib/product-view";
import { createClient } from "@/lib/supabase/server";
import { ControlHeading, ControlTime } from "@/components/control/ui";
import { AdminActionForm } from "@/components/control/admin-action-form";
import { setControlFeatureRule } from "../actions";
import styles from "@/components/control/control.module.css";

export default async function ProductPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const context = await requirePlatformPermission("product.read");
	const params = await searchParams;
	const query =
		typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
	let workspaceId: string | null = null;
	if (params.workspace && params.workspace !== "global") {
		try {
			workspaceId = adminUUID(params.workspace);
		} catch {
			notFound();
		}
	}
	const client = await createClient();
	const { data, error } = await client.rpc("platform_product", {
		p_workspace_id: workspaceId,
		p_query: query,
	});
	if (error?.code === "22023") notFound();
	if (error || !data)
		throw new Error("Não foi possível carregar o catálogo de módulos.");
	const catalog = data as unknown as ProductCatalog;
	const options = [...catalog.workspaces];
	if (catalog.workspace && !options.some((w) => w.id === catalog.workspace?.id))
		options.unshift(catalog.workspace);
	return (
		<>
			<ControlHeading
				eyebrow="PRODUTO"
				title="Módulos e feature flags"
				description="Controle a disponibilidade dos módulos por plataforma ou workspace. Cada alteração exige motivo e fica registrada na auditoria."
			/>
			<section className={styles.panel}>
				<form action="/control-center/product" className={styles.filters}>
					<label>
						Buscar workspace
						<input
							name="q"
							type="search"
							defaultValue={query}
							maxLength={80}
							placeholder="Nome, slug ou ID"
						/>
					</label>
					<label>
						Aplicar regras em
						<select name="workspace" defaultValue={workspaceId || "global"}>
							<option value="global">Toda a plataforma</option>
							{options.map((w) => (
								<option value={w.id} key={w.id}>
									{w.name}
								</option>
							))}
						</select>
					</label>
					<button className={styles.button} type="submit">
						Consultar
					</button>
					<Link href="/control-center/product">Limpar</Link>
				</form>
				{catalog.total_workspaces > 25 ? (
					<p>
						Mostrando até 25 resultados. Busque o workspace pelo nome para
						refinar a seleção.
					</p>
				) : null}
				<div className={styles.scopeNotice}>
					<strong>
						{catalog.workspace
							? `Workspace: ${catalog.workspace.name}`
							: "Escopo global: todos os workspaces"}
					</strong>
					<p>
						{catalog.workspace
							? "Herdar usa a regra da plataforma. Uma desativação global sempre prevalece sobre regras individuais."
							: "As regras globais valem para os workspaces que herdam esta configuração. Desativar um módulo globalmente pausa seu uso em toda a plataforma."}
					</p>
					{catalog.workspace?.status === "suspended" ? (
						<p>
							Este workspace está suspenso. Alterar um módulo não reativa o
							acesso.
						</p>
					) : null}
				</div>
			</section>
			<section className={styles.featureGrid} aria-label="Catálogo de módulos">
				{catalog.features.map((feature) => {
					const rule = catalog.workspace ? feature.rule : feature.global;
					return (
						<article
							className={`${styles.panel} ${styles.featureCard}`}
							key={feature.code}
						>
							<div className={styles.featureTitle}>
								<h2>{feature.label}</h2>
								<span
									className={styles.featureState}
									data-state={feature.effective.state}
								>
									{moduleStateLabels[feature.effective.state]}
								</span>
							</div>
							<p>{feature.description}</p>
							<ul className={styles.capabilities}>
								{feature.capabilities.map((capability) => (
									<li key={capability}>{capability}</li>
								))}
							</ul>
							<dl className={styles.facts}>
								<div>
									<dt>Estado efetivo</dt>
									<dd>{moduleStateLabels[feature.effective.state]}</dd>
								</div>
								<div>
									<dt>Origem</dt>
									<dd>{moduleSourceLabels[feature.effective.source]}</dd>
								</div>
								<div>
									<dt>Regra da plataforma</dt>
									<dd>{moduleStateLabels[feature.global.state]}</dd>
								</div>
								{catalog.workspace ? (
									<div>
										<dt>Regra do workspace</dt>
										<dd>{moduleStateLabels[feature.rule.state]}</dd>
									</div>
								) : null}
							</dl>
							{feature.code === "growth_ai" ? (
								<p>
									Growth AI depende do CRM e da integração de IA configurada.
									Mensagens geradas continuam sujeitas à revisão.
								</p>
							) : null}
							{feature.code === "whatsapp" ? (
								<p>
									Pausar o uso preserva o histórico e o recebimento pelos
									webhooks existentes.
								</p>
							) : null}
							{context.permissions.includes("feature_flags.manage") ? (
								<details className={styles.ruleEditor}>
									<summary>Editar regra de {feature.label}</summary>
									<AdminActionForm
										key={`${workspaceId || "global"}:${rule.revision}:${feature.global.revision}`}
										action={setControlFeatureRule}
										label="Salvar regra"
									>
										<input name="feature" type="hidden" value={feature.code} />
										<input
											name="workspace"
											type="hidden"
											value={workspaceId || ""}
										/>
										<input
											name="revision"
											type="hidden"
											value={rule.revision}
										/>
										<input
											name="global_revision"
											type="hidden"
											value={feature.global.revision}
										/>
										<label>
											Nova regra
											<select name="state" defaultValue={rule.state} required>
												{catalog.workspace ? (
													<option value="inherit">Herdar da plataforma</option>
												) : null}
												<option value="enabled">Ativo</option>
												<option value="beta">Beta</option>
												<option value="disabled">Desativado</option>
											</select>
										</label>
										<p>
											Ativo e Beta permitem o uso. Desativado bloqueia o módulo
											sem apagar seus dados.
										</p>
									</AdminActionForm>
								</details>
							) : (
								<p>Seu papel permite consultar estas regras.</p>
							)}
							<p className={styles.ruleTime}>
								Última alteração:{" "}
								<ControlTime
									value={rule.updated_at || feature.global.updated_at}
									timezone={context.presentation?.timezone}
								/>
							</p>
						</article>
					);
				})}
			</section>
		</>
	);
}
