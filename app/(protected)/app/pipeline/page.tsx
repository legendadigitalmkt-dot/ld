import Link from "next/link";
import { uuidPattern } from "@/lib/workspace-selection";
import { pipelineStages, type PipelineDeal } from "@/lib/pipeline-view";
import { PipelineKanban } from "./pipeline-kanban";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/lib/workspace";
import { RefreshResults } from "@/components/app/dashboard-interactions";
import { Icon } from "@/components/ui/icons";
import styles from "@/components/app/app.module.css";

export default async function PipelinePage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const params = await searchParams;
	const focusedDeal =
		typeof params.deal === "string" && uuidPattern.test(params.deal)
			? params.deal
			: "";
	const workspace = await requireWorkspace();
	const supabase = await createClient();
	let query = supabase
		.from("deals")
		.select(
			"id,title,stage,value,probability,last_activity_at,contact_id,contacts!deals_contact_same_workspace(name,company,source)",
			{ count: "exact" },
		)
		.eq("workspace_id", workspace.id)
		.order("updated_at", { ascending: false })
		.order("id")
		.limit(1000);
	if (focusedDeal) query = query.eq("id", focusedDeal);
	const { data, error, count } = await query;
	if (error) throw new Error("Não foi possível carregar as oportunidades.");
	const deals: PipelineDeal[] = (data || []).map((deal) => ({
		id: deal.id,
		title: deal.title,
		stage: deal.stage,
		value: Number(deal.value || 0),
		probability: deal.probability,
		last_activity_at: deal.last_activity_at,
		contact_id: deal.contact_id,
		contact_name: deal.contacts?.name || "Contato",
		company: deal.contacts?.company || null,
		source: deal.contacts?.source || "Sem origem",
	}));
	const initialStage = focusedDeal
		? "all"
		: typeof params.stage === "string" &&
				(params.stage === "all" ||
					pipelineStages.some((stage) => stage.id === params.stage))
			? params.stage
			: "open";
	const initialView =
		params.view === "table" || params.view === "forecast"
			? params.view
			: "kanban";
	return (
		<>
			<div className={styles.pageHeader}>
				<div>
					<span className={styles.eyebrow}>CRM · FUNIL DE VENDAS</span>
					<h1>Transforme conversas em negócios.</h1>
					<p>
						Organize as oportunidades, acompanhe o forecast e dê o próximo
						passo.
					</p>
				</div>
				<div className={styles.headerActions}>
					<RefreshResults />
					<Link className="button" href="/app/contacts?new=1#new-contact">
						<Icon name="plus" />
						&nbsp;{workspace.role !== "viewer" ? "Novo lead" : "Ver contatos"}
					</Link>
				</div>
			</div>
			{focusedDeal ? (
				<p className={styles.notice}>
					Oportunidade selecionada.{" "}
					<Link href="/app/pipeline">Mostrar todo o pipeline →</Link>
				</p>
			) : null}
			{(count || 0) > deals.length ? (
				<p className={styles.notice}>
					Exibindo as {deals.length} oportunidades mais recentes de {count}. Os
					indicadores abaixo consideram este conjunto.
				</p>
			) : null}
			<PipelineKanban
				key={`${focusedDeal}-${initialStage}-${initialView}-${params.idle || ""}`}
				initialDeals={deals}
				canEdit={workspace.role !== "viewer"}
				timezone={workspace.timezone}
				asOf={new Date().toISOString()}
				initialStage={initialStage}
				initialIdle={params.idle === "1"}
				initialView={initialView}
			/>
		</>
	);
}
