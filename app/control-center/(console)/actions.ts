"use server";
import { revalidatePath } from "next/cache";
import { requirePlatformPermission, controlError } from "@/lib/control";
import {
	adminReason,
	adminUUID,
	assignableRole,
	type AdminActionState,
} from "@/lib/control-view";
import { createClient } from "@/lib/supabase/server";
import { moduleCode, ruleRevision, ruleState } from "@/lib/product-view";

function text(form: FormData, key: string) {
	const value = form.get(key);
	return typeof value === "string" ? value : "";
}
function stateError(error: unknown): AdminActionState {
	return {
		error:
			error instanceof Error
				? error.message
				: "Não foi possível concluir a ação.",
	};
}

export async function setControlFeatureRule(
	_previous: AdminActionState,
	form: FormData,
): Promise<AdminActionState> {
	await requirePlatformPermission("feature_flags.manage");
	try {
		const reason = adminReason(form.get("reason"), form.get("confirmation"));
		const rawWorkspace = text(form, "workspace");
		const workspaceId = rawWorkspace ? adminUUID(rawWorkspace) : null;
		const client = await createClient();
		const { error } = await client.rpc("platform_set_feature_rule", {
			p_feature: moduleCode(form.get("feature")),
			p_workspace_id: workspaceId,
			p_state: ruleState(form.get("state"), workspaceId !== null),
			p_revision: ruleRevision(form.get("revision"), workspaceId ? 0 : 1),
			p_global_revision: ruleRevision(form.get("global_revision"), 1),
			p_reason: reason,
			p_confirmed: true,
		});
		if (error) return { error: controlError(error.code) };
		revalidatePath("/control-center", "layout");
		revalidatePath("/app", "layout");
		return { message: "Regra salva. A alteração foi registrada na auditoria." };
	} catch (error) {
		return stateError(error);
	}
}

export async function setControlStatus(
	_previous: AdminActionState,
	form: FormData,
): Promise<AdminActionState> {
	const entity = text(form, "entity");
	if (entity !== "user" && entity !== "workspace")
		return { error: "Entidade inválida." };
	await requirePlatformPermission(
		entity === "user" ? "users.suspend" : "workspaces.suspend",
	);
	try {
		const reason = adminReason(form.get("reason"), form.get("confirmation"));
		const status = text(form, "status"),
			expected = text(form, "expected");
		if (
			!["active", "suspended"].includes(status) ||
			!["active", "suspended"].includes(expected) ||
			status === expected
		)
			throw new Error("Status inválido. Atualize a página.");
		const client = await createClient();
		const { error } = await client.rpc("platform_set_status", {
			p_entity: entity,
			p_id: adminUUID(form.get("id")),
			p_status: status,
			p_expected_status: expected,
			p_reason: reason,
			p_confirmed: true,
		});
		if (error) return { error: controlError(error.code) };
		revalidatePath("/control-center", "layout");
		revalidatePath("/app", "layout");
		return {
			message:
				status === "suspended"
					? "Acesso suspenso. A ação foi registrada."
					: "Acesso reativado. A ação foi registrada.",
		};
	} catch (error) {
		return stateError(error);
	}
}
export async function setControlRole(
	_previous: AdminActionState,
	form: FormData,
): Promise<AdminActionState> {
	await requirePlatformPermission("roles.manage");
	try {
		const reason = adminReason(form.get("reason"), form.get("confirmation"));
		const enabled = text(form, "enabled");
		if (enabled !== "true" && enabled !== "false")
			throw new Error("Ação inválida.");
		const client = await createClient();
		const { error } = await client.rpc("platform_set_role", {
			p_user: adminUUID(form.get("id")),
			p_role: assignableRole(form.get("role")),
			p_enabled: enabled === "true",
			p_reason: reason,
			p_confirmed: true,
		});
		if (error) return { error: controlError(error.code) };
		revalidatePath("/control-center", "layout");
		return { message: "Permissão atualizada e registrada na auditoria." };
	} catch (error) {
		return stateError(error);
	}
}
export async function saveControlSettings(
	_previous: AdminActionState,
	form: FormData,
): Promise<AdminActionState> {
	await requirePlatformPermission("system.settings");
	try {
		const reason = adminReason(form.get("reason"), form.get("confirmation"));
		const revision = Number(text(form, "revision"));
		if (!Number.isSafeInteger(revision) || revision < 1)
			throw new Error("Versão inválida. Atualize a página.");
		const client = await createClient();
		const { error } = await client.rpc("platform_save_settings", {
			p_revision: revision,
			p_name: text(form, "display_name").trim(),
			p_timezone: text(form, "timezone"),
			p_email: text(form, "support_email").trim(),
			p_reason: reason,
			p_confirmed: true,
		});
		if (error) return { error: controlError(error.code) };
		revalidatePath("/control-center", "layout");
		return { message: "Configurações salvas e registradas na auditoria." };
	} catch (error) {
		return stateError(error);
	}
}
