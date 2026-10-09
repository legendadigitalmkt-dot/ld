"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAccessibleWorkspaces, requireWorkspace } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import { escapeSearch, workspaceCookie } from "@/lib/workspace-selection";

export async function switchWorkspace(formData: FormData) {
	const id = String(formData.get("workspaceId") || "");
	const allowed = await getAccessibleWorkspaces();
	if (!allowed.some((item) => item.id === id)) redirect("/app?error=workspace");
	const cookieStore = await cookies();
	cookieStore.set(workspaceCookie, id, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: 60 * 60 * 24 * 30,
	});
	revalidatePath("/app", "layout");
	redirect("/app");
}

export type SearchItem = {
	id: string;
	title: string;
	kind: "Contato" | "Oportunidade" | "Tarefa";
	href: string;
};
export async function searchWorkspace(
	query: string,
): Promise<{ items: SearchItem[]; error?: string }> {
	if (typeof query !== "string") return { items: [] };
	const term = escapeSearch(query);
	if (term.length < 2) return { items: [] };
	const workspace = await requireWorkspace();
	const supabase = await createClient();
	const pattern = `%${term}%`;
	const [contacts, deals, tasks] = await Promise.all([
		supabase
			.from("contacts")
			.select("id,name")
			.eq("workspace_id", workspace.id)
			.ilike("name", pattern)
			.order("name")
			.limit(5),
		supabase
			.from("deals")
			.select("id,title")
			.eq("workspace_id", workspace.id)
			.ilike("title", pattern)
			.order("title")
			.limit(5),
		supabase
			.from("tasks")
			.select("id,title")
			.eq("workspace_id", workspace.id)
			.ilike("title", pattern)
			.order("title")
			.limit(5),
	]);
	if (contacts.error || deals.error || tasks.error)
		return {
			items: [],
			error: "Não foi possível concluir a busca. Tente novamente.",
		};
	return {
		items: [
			...(contacts.data || []).map(
				(item): SearchItem => ({
					id: item.id,
					title: item.name,
					kind: "Contato",
					href: `/app/contacts/${item.id}`,
				}),
			),
			...(deals.data || []).map(
				(item): SearchItem => ({
					id: item.id,
					title: item.title,
					kind: "Oportunidade",
					href: `/app/pipeline?deal=${item.id}#deal-${item.id}`,
				}),
			),
			...(tasks.data || []).map(
				(item): SearchItem => ({
					id: item.id,
					title: item.title,
					kind: "Tarefa",
					href: `/app/tasks?status=all&task=${item.id}#task-${item.id}`,
				}),
			),
		],
	};
}
