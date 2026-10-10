"use server";
import { requireWorkspace } from "@/lib/workspace";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { uuidPattern } from "@/lib/workspace-selection";
import type { ContactContext } from "@/lib/contact-context";
import { growthAIPayload, type GrowthAIState } from "@/lib/growth-ai";
import {
	growthAIConfigured,
	reserveGrowthRequest,
	requestGrowthAI,
} from "@/lib/growth-ai-provider";

export async function generateContactReview(
	_previous: GrowthAIState,
	data: FormData,
): Promise<GrowthAIState> {
	const workspace = await requireWorkspace();
	const user = await requireUser();
	const contactId = String(data.get("contactId") || "");
	if (!uuidPattern.test(contactId))
		return { error: "O contato informado não é válido." };
	if (!growthAIConfigured())
		return {
			error:
				"Geração por IA indisponível. O resumo do CRM continua disponível.",
		};
	const supabase = await createClient();
	const { data: context, error } = await supabase.rpc("contact_context", {
		p_workspace_id: workspace.id,
		p_contact_id: contactId,
		p_history_page: 1,
	});
	if (error || !context)
		return {
			error: "Não foi possível consultar esse contato no workspace atual.",
		};
	if (!reserveGrowthRequest(`${workspace.id}:${user.id}`))
		return { error: "Aguarde 30 segundos entre gerações de IA." };
	const current = context as unknown as ContactContext;
	const ids = current.conversations.map((c) => c.id);
	const messages = ids.length
		? await supabase
				.from("messages")
				.select("direction,body,created_at,delivery_status")
				.eq("workspace_id", workspace.id)
				.in("conversation_id", ids)
				.order("created_at", { ascending: false })
				.order("id")
				.limit(8)
		: { data: [], error: null };
	if (messages.error)
		return {
			error:
				"Não foi possível consultar o histórico de mensagens. Tente novamente.",
		};
	try {
		const now = new Date().toISOString();
		return {
			result: await requestGrowthAI(
				growthAIPayload(current, messages.data || [], now),
			),
			generatedAt: now,
		};
	} catch {
		return {
			error:
				"Não foi possível concluir a geração por IA. O resumo do CRM continua disponível; tente novamente mais tarde.",
		};
	}
}
