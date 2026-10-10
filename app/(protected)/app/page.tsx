import { OverviewView } from "@/components/app/overview";
import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/product";
import type { Overview } from "@/lib/operational";

export default async function DashboardPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const workspace = await requireModule("crm");
	const params = await searchParams;
	const days = params.days === "90" ? 90 : 30;
	const supabase = await createClient();
	const { data, error } = await supabase.rpc("growth_overview", {
		p_workspace_id: workspace.id,
		p_days: days,
	});
	if (error || !data)
		throw new Error("Não foi possível carregar os indicadores da operação.");
	return (
		<OverviewView
			data={data as unknown as Overview}
			name={workspace.name}
			timezone={workspace.timezone}
			canEdit={workspace.role !== "viewer"}
			workspaceError={params.error === "workspace"}
		/>
	);
}
