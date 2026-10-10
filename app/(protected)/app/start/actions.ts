"use server";
import { planLimitError } from "@/lib/plans-view";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireModule } from "@/lib/product";
import { createClient } from "@/lib/supabase/server";
import {
	readActivationLead,
	activationPath,
	type ActivationState,
} from "@/lib/activation";
import { readTaskInput } from "@/lib/task-input";
import { uuidPattern } from "@/lib/workspace-selection";
import { parseDealValue } from "@/lib/pipeline-view";
import type { ContactContext } from "@/lib/contact-context";

export async function createActivationLead(
	_previous: ActivationState,
	data: FormData,
): Promise<ActivationState> {
	const workspace = await requireModule("crm");
	if (workspace.role === "viewer")
		return { error: "Sua conta permite apenas consultar os primeiros passos." };
	let input: ReturnType<typeof readActivationLead>;
	try {
		input = readActivationLead(data);
	} catch (error) {
		return {
			error:
				error instanceof Error ? error.message : "Confira os dados do contato.",
		};
	}
	const supabase = await createClient();
	const { data: records, error } = await supabase.rpc("create_lead_with_deal", {
		p_workspace_id: workspace.id,
		p_name: input.name,
		p_phone: input.phone,
		p_source: input.source,
		p_intake_key: input.intakeKey,
	});
	const record = records?.[0];
	if (error || !record)
		return {
			error:
				planLimitError(error?.code) ||
				"Não foi possível criar o contato e a oportunidade. Confira sua permissão e tente novamente.",
		};
	revalidatePath("/app", "layout");
	redirect(activationPath(record.contact_id));
}
export async function createActivationOpportunity(
	_previous: ActivationState,
	data: FormData,
): Promise<ActivationState> {
	const workspace = await requireModule("crm");
	if (workspace.role === "viewer")
		return { error: "Sua conta permite apenas consultar os primeiros passos." };
	const contactId = String(data.get("contactId") || "");
	const title = String(data.get("title") || "").trim();
	const value = parseDealValue(String(data.get("value") || "0"));
	if (
		!uuidPattern.test(contactId) ||
		title.length < 2 ||
		title.length > 180 ||
		value === null ||
		value > 999999999999.99
	)
		return { error: "Confira o contato, o título e o valor da oportunidade." };
	const supabase = await createClient();
	const { data: context, error: contextError } = await supabase.rpc(
		"contact_context",
		{
			p_workspace_id: workspace.id,
			p_contact_id: contactId,
			p_history_page: 1,
		},
	);
	if (contextError || !context)
		return { error: "Esse contato não está disponível no workspace atual." };
	if ((context as unknown as ContactContext).stats.deals)
		redirect(activationPath(contactId));
	const { error } = await supabase.from("deals").insert({
		workspace_id: workspace.id,
		contact_id: contactId,
		title,
		value,
		stage: "new",
		probability: 20,
	});
	if (error)
		return {
			error:
				planLimitError(error.code) ||
				"Não foi possível criar a oportunidade. Confira sua permissão e tente novamente.",
		};
	revalidatePath("/app", "layout");
	redirect(activationPath(contactId));
}
export async function createActivationTask(
	_previous: ActivationState,
	data: FormData,
): Promise<ActivationState> {
	const workspace = await requireModule("crm");
	if (workspace.role === "viewer")
		return { error: "Sua conta permite apenas consultar os primeiros passos." };
	const contactId = String(data.get("contactId") || "");
	const dealId = String(data.get("dealId") || "");
	if (!uuidPattern.test(contactId) || !uuidPattern.test(dealId))
		return {
			error: "Escolha um contato e sua oportunidade antes de criar a tarefa.",
		};
	let input: ReturnType<typeof readTaskInput>;
	try {
		input = readTaskInput(data, workspace.timezone);
		if (!input.due_at) return { error: "Defina o prazo da primeira tarefa." };
	} catch (error) {
		return {
			error:
				error instanceof Error ? error.message : "Confira os dados da tarefa.",
		};
	}
	const supabase = await createClient();
	const { data: context, error: contextError } = await supabase.rpc(
		"contact_context",
		{
			p_workspace_id: workspace.id,
			p_contact_id: contactId,
			p_history_page: 1,
		},
	);
	const current = context as unknown as ContactContext | null;
	if (contextError || !current || !current.deals.some((d) => d.id === dealId))
		return {
			error:
				"A oportunidade não corresponde a esse contato no workspace atual.",
		};
	if (current.stats.tasks) redirect(`${activationPath(contactId)}&ready=1`);
	const { data: task, error } = await supabase.rpc("create_workspace_task", {
		p_workspace_id: workspace.id,
		p_contact_id: contactId,
		p_deal_id: dealId,
		p_title: input.title,
		p_priority: input.priority,
		p_due_at: input.due_at,
	});
	if (error || !task)
		return {
			error:
				planLimitError(error?.code) ||
				"Não foi possível criar a tarefa. Confira sua permissão e tente novamente.",
		};
	revalidatePath("/app", "layout");
	redirect(`${activationPath(contactId)}&ready=1`);
}
