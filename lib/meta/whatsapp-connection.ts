import "server-only";
import { requireWorkspace } from "@/lib/workspace";
import { createAdminClient } from "@/lib/supabase/admin";

// Integration rows are admin-only under RLS. Operators receive only the current workspace's asset IDs internally.
export async function getCurrentWhatsAppConnection() {
	const workspace = await requireWorkspace();
	if (workspace.role === "viewer") return null;
	const { data, error } = await createAdminClient()
		.from("integration_connections")
		.select("external_account_id,external_resource_id,status")
		.eq("workspace_id", workspace.id)
		.eq("provider", "whatsapp_cloud")
		.maybeSingle();
	if (error) throw new Error("Não foi possível carregar o canal WhatsApp.");
	return data?.status === "connected" && data.external_resource_id
		? { ...data, external_resource_id: data.external_resource_id }
		: null;
}
