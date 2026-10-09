"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace, isWorkspaceAdmin } from "@/lib/workspace";
import { readWorkspaceInput } from "@/lib/workspace-input";
import type { ContactActionState } from "@/lib/contact-context";
export async function saveWorkspace(
	_previous: ContactActionState,
	form: FormData,
): Promise<ContactActionState> {
	const workspace = await requireWorkspace();
	if (!isWorkspaceAdmin(workspace.role))
		return {
			error:
				"Somente proprietários e administradores podem alterar o workspace.",
		};
	let input: ReturnType<typeof readWorkspaceInput>;
	try {
		input = readWorkspaceInput(form);
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: "Confira os dados do workspace.",
		};
	}
	const expected = String(form.get("expectedUpdatedAt") || "");
	if (!expected || !Number.isFinite(Date.parse(expected)))
		return { error: "Atualize a página antes de salvar." };
	const supabase = await createClient();
	const { error } = await supabase.rpc("update_workspace_profile", {
		p_workspace_id: workspace.id,
		p_expected_updated_at: expected,
		p_name: input.name,
		p_segment: input.segment,
		p_timezone: input.timezone,
	});
	if (error)
		return {
			error:
				error.code === "40001"
					? "O workspace foi alterado por outra pessoa. Seus dados não foram gravados; recarregue para revisar a versão atual."
					: "Não foi possível salvar as configurações. Confira sua permissão e o fuso escolhido.",
		};
	revalidatePath("/app", "layout");
	redirect("/app/settings?saved=workspace");
}
