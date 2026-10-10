"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAppUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
	isWorkspaceAdmin,
	requireWorkspace,
	type WorkspaceRole,
} from "@/lib/workspace";
import { planLimitError } from "@/lib/plans-view";
const allowedRoles: WorkspaceRole[] = [
	"owner",
	"admin",
	"sales",
	"support",
	"viewer",
];
function fail(message: string): never {
	redirect(`/app/settings/members?error=${encodeURIComponent(message)}`);
}
export async function inviteMember(formData: FormData) {
	const workspace = await requireWorkspace();
	if (!isWorkspaceAdmin(workspace.role))
		fail("Somente owners e admins podem convidar membros.");
	const email = String(formData.get("email") || "")
			.trim()
			.toLowerCase(),
		role = String(formData.get("role") || "viewer") as WorkspaceRole;
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
		fail("Informe um e-mail válido.");
	if (!allowedRoles.includes(role)) fail("Papel inválido.");
	if (role === "owner" && workspace.role !== "owner")
		fail("Somente um owner pode convidar outro owner.");
	const client = await createClient();
	const { data: reservation, error: reservationError } = await client.rpc(
		"reserve_member_slot",
		{ p_workspace_id: workspace.id, p_email: email, p_role: role },
	);
	if (reservationError || !reservation)
		fail(
			planLimitError(reservationError?.code) ||
				"Não foi possível reservar a vaga. Confira a equipe existente e os convites em andamento.",
		);
	let problem: string | null = null;
	try {
		const admin = createAdminClient();
		const { data: invitation, error: inviteError } =
			await admin.auth.admin.inviteUserByEmail(email, {
				redirectTo: `${getAppUrl()}/auth/callback?next=/app`,
			});
		if (inviteError || !invitation.user)
			problem =
				"Não foi possível enviar o convite. Confira o e-mail e se a conta já está cadastrada.";
		else {
			const { error: membershipError } = await client.rpc(
				"complete_member_slot",
				{ p_reservation_id: reservation, p_user_id: invitation.user.id },
			);
			if (membershipError)
				problem =
					"O convite foi enviado, mas o vínculo não foi concluído. Confira suas permissões e solicite suporte para retomar o vínculo.";
		}
	} catch {
		problem =
			"Não foi possível concluir o convite. Confira a equipe antes de tentar novamente.";
	} finally {
		await client.rpc("cancel_member_slot", { p_reservation_id: reservation });
	}
	if (problem) fail(problem);
	revalidatePath("/app", "layout");
	redirect(
		`/app/settings/members?message=${encodeURIComponent("Convite enviado.")}`,
	);
}
