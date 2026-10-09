"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import { readContactInput, readContactNote } from "@/lib/contact-input";
import { uuidPattern } from "@/lib/workspace-selection";
import type { ContactActionState } from "@/lib/contact-context";

function contactId(form: FormData) {
	const id = String(form.get("contactId") || "");
	return uuidPattern.test(id) ? id : null;
}
function refresh(id: string) {
	revalidatePath("/app", "layout");
	revalidatePath(`/app/contacts/${id}`);
}

export async function saveContact(
	_previous: ContactActionState,
	form: FormData,
): Promise<ContactActionState> {
	const workspace = await requireWorkspace();
	const id = contactId(form);
	if (!id || workspace.role === "viewer")
		return { error: "Sua conta não pode alterar esse contato." };
	let input: ReturnType<typeof readContactInput>;
	try {
		input = readContactInput(form);
	} catch (error) {
		return {
			error:
				error instanceof Error ? error.message : "Confira os dados do contato.",
		};
	}
	const expected = String(form.get("expectedUpdatedAt") || "");
	if (!expected || !Number.isFinite(Date.parse(expected)))
		return { error: "Atualize o perfil antes de salvar." };
	const supabase = await createClient();
	const { error } = await supabase.rpc("update_contact_profile", {
		p_workspace_id: workspace.id,
		p_contact_id: id,
		p_expected_updated_at: expected,
		p_name: input.name,
		p_company: input.company,
		p_email: input.email,
		p_phone: input.phone,
		p_source: input.source,
		p_status: input.status,
		p_tags: input.tags,
		p_owner_user_id: input.owner,
	});
	if (error)
		return {
			error:
				error.code === "40001"
					? "Este perfil foi alterado por outra pessoa. Seus dados não foram gravados; recarregue o perfil para revisar a versão atual."
					: "Não foi possível salvar. Confira os dados e o responsável do workspace.",
		};
	refresh(id);
	redirect(`/app/contacts/${id}?saved=profile`);
}

export async function addNote(
	_previous: ContactActionState,
	form: FormData,
): Promise<ContactActionState> {
	const workspace = await requireWorkspace();
	const id = contactId(form);
	if (!id || workspace.role === "viewer")
		return { error: "Sua conta não pode adicionar notas." };
	let input: ReturnType<typeof readContactNote>;
	try {
		input = readContactNote(form);
	} catch (error) {
		return {
			error: error instanceof Error ? error.message : "Confira a nota.",
		};
	}
	const supabase = await createClient();
	const { error } = await supabase.rpc("add_contact_note", {
		p_workspace_id: workspace.id,
		p_contact_id: id,
		p_body: input.body,
		p_request_id: input.requestId,
	});
	if (error)
		return {
			error:
				"Não foi possível adicionar a nota. Sua edição permanece no formulário.",
		};
	refresh(id);
	redirect(`/app/contacts/${id}?saved=note#notas`);
}
