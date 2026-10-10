import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/lib/workspace";
import {
	moduleCodes,
	type ModuleCode,
	type WorkspaceModules,
} from "@/lib/product-view";

export const getWorkspaceModules = cache(
	async (workspaceId: string): Promise<WorkspaceModules> => {
		const client = await createClient();
		const { data, error } = await client.rpc("workspace_modules", {
			p_workspace_id: workspaceId,
		});
		if (error || !data || typeof data !== "object" || Array.isArray(data))
			throw new Error("Não foi possível validar os módulos deste workspace.");
		const modules = data as unknown as WorkspaceModules;
		if (moduleCodes.some((code) => typeof modules[code]?.enabled !== "boolean"))
			throw new Error("Não foi possível validar os módulos deste workspace.");
		return modules;
	},
);
export async function requireModule(code: ModuleCode) {
	const workspace = await requireWorkspace();
	const modules = await getWorkspaceModules(workspace.id);
	if (!modules[code].enabled)
		redirect(`/app/module-unavailable?module=${code}`);
	return workspace;
}
