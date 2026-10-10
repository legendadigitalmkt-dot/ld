import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ControlPermission, PlatformContext } from "@/lib/control-view";

export const getPlatformContext = cache(async (): Promise<PlatformContext> => {
	await requireUser();
	const supabase = await createClient();
	const { data, error } = await supabase.rpc("platform_context");
	if (error || !data)
		throw new Error("Não foi possível validar o acesso administrativo.");
	return data as unknown as PlatformContext;
});
export async function requirePlatformEligibility() {
	const context = await getPlatformContext();
	if (!context.eligible) notFound();
	return context;
}
export async function requirePlatformPermission(
	permission: ControlPermission = "platform.access",
) {
	const context = await requirePlatformEligibility();
	if (!context.mfa_verified) redirect("/control-center/verify");
	if (!context.permissions.includes(permission)) notFound();
	return context;
}
export function controlError(code?: string) {
	if (code === "40001")
		return "Os dados mudaram. Atualize a página e confira a ação novamente.";
	if (code === "42501")
		return "Ação não permitida. Confira suas permissões e a verificação em duas etapas.";
	if (code === "22023") return "Confira os campos e informe um motivo válido.";
	return "Não foi possível concluir a ação. Nenhuma alteração parcial foi salva.";
}
