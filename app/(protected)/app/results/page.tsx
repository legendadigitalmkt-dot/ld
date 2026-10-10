import type { Overview } from "@/lib/operational";
import { overdueResults, resultsPeriod } from "@/lib/results-view";
import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/product";
import { ResultsDashboard } from "./results-dashboard";

export default async function ResultsPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const workspace = await requireModule("crm");
	const days = resultsPeriod((await searchParams).days);
	const supabase = await createClient();
	const { data, error } = await supabase.rpc("growth_overview", {
		p_workspace_id: workspace.id,
		p_days: days,
	});
	if (error || !data)
		throw new Error("Não foi possível carregar os resultados do CRM.");
	const overview = data as unknown as Overview;
	return (
		<ResultsDashboard
			key={`${workspace.id}:${days}`}
			name={workspace.name}
			timezone={workspace.timezone}
			data={{
				as_of: overview.as_of,
				days: overview.days,
				stats: overview.stats,
				revenue: overview.revenue,
				stages: overview.stages,
				tasks: overdueResults(overview),
			}}
		/>
	);
}
