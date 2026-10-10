import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformPermission } from "@/lib/control";
import { adminUUID } from "@/lib/control-view";
import {
	type PlansCatalog,
	planStatusLabels,
	usageLabels,
	usageResources,
} from "@/lib/plans-view";
import { moduleCodes, moduleLabels } from "@/lib/product-view";
import { createClient } from "@/lib/supabase/server";
import { ControlHeading, ControlTime } from "@/components/control/ui";
import { AdminActionForm } from "@/components/control/admin-action-form";
import { PlanFields } from "@/components/control/plan-fields";
import { UsageCards } from "@/components/control/usage-cards";
import { savePlan, publishPlan, assignPlan } from "./actions";
import styles from "@/components/control/control.module.css";
function selected(value: unknown) {
	if (!value) return null;
	try {
		return adminUUID(value);
	} catch {
		notFound();
	}
}
export default async function PlansPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const context = await requirePlatformPermission("plans.read"),
		params = await searchParams;
	const query =
			typeof params.q === "string" ? params.q.trim().slice(0, 80) : "",
		workspaceQuery =
			typeof params.wq === "string" ? params.wq.trim().slice(0, 80) : "";
	const workspaceId = selected(params.workspace),
		planId = selected(params.plan),
		client = await createClient();
	const { data, error } = await client.rpc("platform_plans", {
		p_workspace_id: workspaceId,
		p_plan_id: planId,
		p_query: query,
		p_workspace_query: workspaceQuery,
	});
	if (error?.code === "22023") notFound();
	if (error || !data)
		throw new Error("Não foi possível consultar planos e consumo.");
	const catalog = data as unknown as PlansCatalog,
		plan = catalog.detail,
		workspace = catalog.workspace,
		canWrite = context.permissions.includes("plans.write"),
		options = [...catalog.workspaces];
	if (workspace && !options.some((w) => w.id === workspace.id))
		options.unshift(workspace);
	const href = (id: string) =>
		`/control-center/plans?plan=${id}${workspaceId ? `&workspace=${workspaceId}` : ""}`;
	return (
		<>
			<ControlHeading
				eyebrow="PRODUTO"
				title="Planos e limites"
				description="Publique versões do catálogo e atribua explicitamente cada workspace. Rascunhos preservam as versões em uso."
			/>
			<section className={styles.panel}>
				<form className={styles.filters} action="/control-center/plans">
					<label>
						Buscar plano
						<input
							type="search"
							name="q"
							maxLength={80}
							defaultValue={query}
							placeholder="Nome ou código"
						/>
					</label>
					{workspaceId ? (
						<input type="hidden" name="workspace" value={workspaceId} />
					) : null}
					<button className={styles.button} type="submit">
						Buscar planos
					</button>
					<Link href="/control-center/plans">Limpar</Link>
				</form>
				{catalog.items.length ? (
					<div className={styles.planList}>
						{catalog.items.map((item) => (
							<Link
								key={item.id}
								href={href(item.id)}
								className={styles.planLink}
								aria-current={item.id === planId ? "page" : undefined}
							>
								<strong>{item.name}</strong>
								<span>
									{planStatusLabels[item.status]} ·{" "}
									{item.latest_version
										? `v${item.latest_version}`
										: "Ainda não publicado"}
								</span>
								<small>{item.description || item.code}</small>
							</Link>
						))}
					</div>
				) : (
					<p>
						Nenhum plano encontrado. Cadastre a oferta aprovada como rascunho
						para começar.
					</p>
				)}
				{catalog.total > 25 ? (
					<p>Até 25 resultados. Refine a busca pelo nome ou código do plano.</p>
				) : null}
			</section>
			{canWrite ? (
				<details className={styles.panel}>
					<summary>Cadastrar plano</summary>
					<p>
						Defina módulos e limites conforme a oferta aprovada. O cadastro
						permanece em rascunho até a publicação.
					</p>
					<AdminActionForm
						key="new-plan"
						action={savePlan}
						label="Criar rascunho"
					>
						<PlanFields />
					</AdminActionForm>
				</details>
			) : null}
			{plan ? (
				<section className={styles.panel}>
					<h2>{plan.name}</h2>
					<p>
						{planStatusLabels[plan.status]} · revisão {plan.revision} ·{" "}
						{plan.latest_version
							? `última versão publicada: ${plan.latest_version}`
							: "Sem versão publicada"}
					</p>
					<p>
						Salvar modifica o rascunho e o estado do catálogo. Arquivar impede
						novas atribuições; versões em uso continuam preservadas. Uma nova
						publicação fica disponível para atribuição explícita.
					</p>
					{canWrite ? (
						<details>
							<summary>Editar rascunho e estado do catálogo</summary>
							<AdminActionForm
								key={`${plan.id}-${plan.revision}`}
								action={savePlan}
								label="Salvar rascunho"
							>
								<PlanFields plan={plan} />
							</AdminActionForm>
						</details>
					) : null}
					{canWrite && plan.status !== "archived" ? (
						<details>
							<summary>Publicar nova versão</summary>
							<p>
								A publicação cria uma versão imutável com o nome, módulos e
								limites salvos neste rascunho. Os workspaces atuais mantêm suas
								versões.
							</p>
							<AdminActionForm
								key={`publish-${plan.id}-${plan.revision}`}
								action={publishPlan}
								label="Publicar versão"
							>
								<input type="hidden" name="id" value={plan.id} />
								<input type="hidden" name="revision" value={plan.revision} />
							</AdminActionForm>
						</details>
					) : null}
					<h3>Versões publicadas</h3>
					{plan.versions.length ? (
						plan.versions.map((version) => (
							<details key={version.id} className={styles.versionPreview}>
								<summary>
									v{version.version} · {version.name} ·{" "}
									<ControlTime value={version.published_at} />
								</summary>
								<p>{version.description}</p>
								<ul>
									{moduleCodes.map((code) => (
										<li key={code}>
											{moduleLabels[code]}:{" "}
											{version.config.features[code]
												? "Incluído"
												: "Não incluído"}
										</li>
									))}
								</ul>
								<dl className={styles.facts}>
									{usageResources.map((key) => (
										<div key={key}>
											<dt>{usageLabels[key]}</dt>
											<dd>
												{version.config.limits[key]?.toLocaleString("pt-BR") ??
													"Sem teto configurado"}
											</dd>
										</div>
									))}
								</dl>
							</details>
						))
					) : (
						<p>
							Salve o rascunho e publique a primeira versão para habilitar
							atribuições.
						</p>
					)}
					{plan.latest_version > 10 ? (
						<p>
							Exibindo as 10 versões mais recentes. Versões anteriores
							permanecem preservadas para os workspaces que as utilizam.
						</p>
					) : null}
				</section>
			) : null}
			<section className={styles.panel}>
				<h2>Atribuição e consumo por workspace</h2>
				<form action="/control-center/plans" className={styles.filters}>
					{planId ? <input type="hidden" name="plan" value={planId} /> : null}
					<label>
						Buscar workspace
						<input
							type="search"
							name="wq"
							maxLength={80}
							defaultValue={workspaceQuery}
							placeholder="Nome ou slug"
						/>
					</label>
					<label>
						Workspace
						<select name="workspace" defaultValue={workspaceId || ""}>
							<option value="">Escolha um workspace</option>
							{options.map((w) => (
								<option key={w.id} value={w.id}>
									{w.name}
								</option>
							))}
						</select>
					</label>
					<button type="submit" className={styles.button}>
						Consultar
					</button>
				</form>
				{catalog.total_workspaces > 25 ? (
					<p>Até 25 workspaces. Refine a busca e selecione o resultado.</p>
				) : null}
				{workspace ? (
					<>
						<h3>{workspace.name}</h3>
						<p>
							{workspace.usage.plan
								? `${workspace.usage.plan.name} · versão ${workspace.usage.plan.version}`
								: "Sem plano definido · política existente preservada"}{" "}
							· revisão da atribuição {workspace.usage.assignment_revision}
						</p>
						<UsageCards usage={workspace.usage} />
						<p>
							Limites menores que o consumo preservam os registros e bloqueiam
							novas criações. Dados recebidos por integrações continuam sendo
							contabilizados para preservar o histórico.
						</p>
						{workspace.protected ? (
							<p>
								Workspace proprietário protegido: a operação interna mantém sua
								política atual.
							</p>
						) : workspace.status === "suspended" ? (
							<p>Workspace suspenso. Alterar um plano não reativa sua conta.</p>
						) : null}
						{canWrite &&
						!workspace.protected &&
						plan?.status === "active" &&
						plan.versions.length ? (
							<details>
								<summary>Atribuir versão de {plan.name}</summary>
								<p>
									Confira módulos e limites na versão acima. A atribuição altera
									a disponibilidade e a capacidade das próximas operações deste
									workspace.
								</p>
								<AdminActionForm
									key={`assign-${workspace.id}-${workspace.usage.assignment_revision}-${plan.id}`}
									action={assignPlan}
									label="Atribuir versão ao workspace"
								>
									<input type="hidden" name="workspace" value={workspace.id} />
									<input
										type="hidden"
										name="revision"
										value={workspace.usage.assignment_revision}
									/>
									<label>
										Versão publicada
										<select name="version" required defaultValue="">
											<option value="" disabled>
												Escolha a versão conferida
											</option>
											{plan.versions.map((v) => (
												<option key={v.id} value={v.id}>
													v{v.version} · {v.name}
												</option>
											))}
										</select>
									</label>
								</AdminActionForm>
							</details>
						) : canWrite && !workspace.protected ? (
							<p>
								Selecione um plano ativo com versão publicada no catálogo para
								atribuí-lo.
							</p>
						) : null}
						{canWrite && !workspace.protected && workspace.usage.plan ? (
							<details>
								<summary>Remover atribuição atual</summary>
								<p>
									O workspace volta à política sem plano definido e sem teto
									configurado. Seus dados e o histórico da atribuição ficam
									preservados.
								</p>
								<AdminActionForm
									key={`unassign-${workspace.id}-${workspace.usage.assignment_revision}`}
									action={assignPlan}
									label="Remover atribuição"
									danger
								>
									<input type="hidden" name="workspace" value={workspace.id} />
									<input type="hidden" name="version" value="" />
									<input
										type="hidden"
										name="revision"
										value={workspace.usage.assignment_revision}
									/>
								</AdminActionForm>
							</details>
						) : null}
					</>
				) : (
					<p>Selecione um workspace para consultar plano e consumo agregado.</p>
				)}
			</section>
		</>
	);
}
