import { requireWorkspace } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import type { WorkspaceUsage } from "@/lib/plans-view";
import {
	moduleCodes,
	moduleLabels,
	moduleSourceLabels,
} from "@/lib/product-view";
import { getWorkspaceModules } from "@/lib/product";
import { UsageCards } from "@/components/control/usage-cards";
export default async function WorkspacePlanPage() {
	const workspace = await requireWorkspace(),
		client = await createClient();
	const { data, error } = await client.rpc("workspace_plan", {
		p_workspace_id: workspace.id,
	});
	if (error || !data)
		throw new Error("Não foi possível consultar o plano deste workspace.");
	const usage = data as unknown as WorkspaceUsage,
		modules = await getWorkspaceModules(workspace.id);
	return (
		<section className="panel">
			<p className="eyebrow">{workspace.name} · Plano e consumo</p>
			<h1>{usage.plan?.name || "Sem plano definido"}</h1>
			<p>
				{usage.plan
					? `Versão ${usage.plan.version} atribuída pela administração.`
					: "O workspace mantém a política existente. Nenhuma assinatura ou cobrança foi ativada."}
			</p>
			<UsageCards usage={usage} />
			<h2>Módulos disponíveis</h2>
			<ul>
				{moduleCodes.map((key) => (
					<li key={key}>
						<strong>{moduleLabels[key]}</strong> ·{" "}
						{modules[key].enabled ? "Disponível" : "Indisponível"} ·{" "}
						{moduleSourceLabels[modules[key].source]}
					</li>
				))}
			</ul>
			<p>
				Os limites consideram registros armazenados, incluindo tarefas
				concluídas e oportunidades encerradas. Ao atingir o teto, novas criações
				são bloqueadas; dados existentes permanecem disponíveis conforme suas
				permissões.
			</p>
			<p>
				Solicite ao administrador uma revisão do plano quando precisar de mais
				capacidade. Dados recebidos por integrações podem elevar o consumo acima
				do teto para preservar seu histórico.
			</p>
		</section>
	);
}
