"use server";
import { revalidatePath } from "next/cache";
import { requirePlatformPermission, controlError } from "@/lib/control";
import {
	adminReason,
	adminUUID,
	type AdminActionState,
} from "@/lib/control-view";
import { ruleRevision } from "@/lib/product-view";
import { readPlanDraft } from "@/lib/plans-view";
import { createClient } from "@/lib/supabase/server";
function failure(error: unknown): AdminActionState {
	return {
		error:
			error instanceof Error
				? error.message
				: "Não foi possível concluir a ação.",
	};
}
function refresh() {
	revalidatePath("/control-center", "layout");
	revalidatePath("/app", "layout");
}
export async function savePlan(
	_previous: AdminActionState,
	form: FormData,
): Promise<AdminActionState> {
	await requirePlatformPermission("plans.write");
	try {
		const reason = adminReason(form.get("reason"), form.get("confirmation")),
			draft = readPlanDraft(form),
			id = form.get("id");
		const client = await createClient();
		const { error } = await client.rpc("platform_save_plan", {
			p_id: id ? adminUUID(id) : null,
			p_code: draft.code,
			p_name: draft.name,
			p_description: draft.description,
			p_status: draft.status,
			p_config: draft.config,
			p_revision: ruleRevision(form.get("revision"), id ? 1 : 0),
			p_reason: reason,
			p_confirmed: true,
		});
		if (error) return { error: controlError(error.code) };
		refresh();
		return {
			message:
				"Rascunho salvo. Publique uma versão para disponibilizar atribuições.",
		};
	} catch (error) {
		return failure(error);
	}
}
export async function publishPlan(
	_previous: AdminActionState,
	form: FormData,
): Promise<AdminActionState> {
	await requirePlatformPermission("plans.write");
	try {
		const reason = adminReason(form.get("reason"), form.get("confirmation")),
			client = await createClient();
		const { error } = await client.rpc("platform_publish_plan", {
			p_id: adminUUID(form.get("id")),
			p_revision: ruleRevision(form.get("revision"), 1),
			p_reason: reason,
			p_confirmed: true,
		});
		if (error) return { error: controlError(error.code) };
		refresh();
		return {
			message:
				"Versão publicada. Workspaces mantêm a versão anteriormente atribuída.",
		};
	} catch (error) {
		return failure(error);
	}
}
export async function assignPlan(
	_previous: AdminActionState,
	form: FormData,
): Promise<AdminActionState> {
	await requirePlatformPermission("plans.write");
	try {
		const reason = adminReason(form.get("reason"), form.get("confirmation")),
			version = form.get("version"),
			client = await createClient();
		const { error } = await client.rpc("platform_assign_plan", {
			p_workspace_id: adminUUID(form.get("workspace")),
			p_version_id: version ? adminUUID(version) : null,
			p_revision: ruleRevision(form.get("revision"), 1),
			p_reason: reason,
			p_confirmed: true,
		});
		if (error) return { error: controlError(error.code) };
		refresh();
		return {
			message:
				"Atribuição salva e auditada. As regras são aplicadas às próximas operações.",
		};
	} catch (error) {
		return failure(error);
	}
}
