import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { selectWorkspace, workspaceCookie } from "@/lib/workspace-selection";

export type WorkspaceRole = "owner" | "admin" | "sales" | "support" | "viewer";

export type CurrentWorkspace = {
	id: string;
	name: string;
	slug: string;
	segment: string | null;
	timezone: string;
	role: WorkspaceRole;
};

export const getAccessibleWorkspaces = cache(
	async (): Promise<CurrentWorkspace[]> => {
		const user = await requireUser();
		const supabase = await createClient();
		const { data, error } = await supabase
			.from("workspace_members")
			.select("role, workspace:workspaces!inner(id,name,slug,segment,timezone)")
			.eq("user_id", user.id)
			.order("created_at", { ascending: true });

		if (error) throw new Error(`Failed to load workspace: ${error.message}`);
		return (data || []).flatMap((membership) => {
			const workspace = Array.isArray(membership.workspace)
				? membership.workspace[0]
				: membership.workspace;
			if (!workspace) return [];
			return [
				{
					id: String(workspace.id),
					name: String(workspace.name),
					slug: String(workspace.slug),
					segment: workspace.segment ? String(workspace.segment) : null,
					timezone: String(workspace.timezone),
					role: membership.role as WorkspaceRole,
				},
			];
		});
	},
);

export const getCurrentWorkspace = cache(
	async (): Promise<CurrentWorkspace | null> => {
		return selectWorkspace(
			await getAccessibleWorkspaces(),
			(await cookies()).get(workspaceCookie)?.value,
		);
	},
);

export async function requireWorkspace(): Promise<CurrentWorkspace> {
	const workspace = await getCurrentWorkspace();
	if (!workspace) redirect("/onboarding");
	return workspace;
}

export function isWorkspaceAdmin(role: WorkspaceRole) {
	return role === "owner" || role === "admin";
}
