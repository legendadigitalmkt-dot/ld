"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getCurrentWhatsAppConnection } from "@/lib/meta/whatsapp-connection";
import {
	getApprovedWhatsAppTemplates,
	sendWhatsAppTemplate,
	sendWhatsAppText,
} from "@/lib/meta/whatsapp";
import {
	WhatsAppApiError,
	whatsappFailureMessage,
	whatsappServiceWindow,
} from "@/lib/meta/whatsapp-policy";
import { prepareTemplateMessage } from "@/lib/meta/whatsapp-templates";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/product";
import { uuidPattern } from "@/lib/workspace-selection";
import type { InboxSendState } from "@/components/inbox/composer";

class InboxInputError extends Error {}

async function sendContext(formData: FormData) {
	const [user, workspace] = await Promise.all([
		requireUser(),
		requireModule("whatsapp"),
	]);
	if (workspace.role === "viewer")
		throw new InboxInputError("Seu papel não permite enviar mensagens.");
	const conversationId = String(formData.get("conversationId") || "").trim();
	if (!uuidPattern.test(conversationId))
		throw new InboxInputError("Conversa inválida.");
	const supabase = await createClient();
	const { data: conversation, error } = await supabase
		.from("conversations")
		.select("id,channel,external_thread_id,contact_id")
		.eq("workspace_id", workspace.id)
		.eq("id", conversationId)
		.maybeSingle();
	if (error || !conversation)
		throw new InboxInputError("Conversa não encontrada no workspace atual.");
	if (conversation.channel !== "whatsapp" || !conversation.external_thread_id) {
		throw new InboxInputError("Esta conversa não está conectada ao WhatsApp.");
	}
	const connection = await getCurrentWhatsAppConnection();
	if (!connection)
		throw new InboxInputError("Conecte o WhatsApp antes de enviar mensagens.");
	return {
		user,
		workspace,
		conversation: {
			...conversation,
			external_thread_id: conversation.external_thread_id,
		},
		connection,
		supabase,
		admin: createAdminClient(),
	};
}

async function persistAcceptedMessage(
	context: Awaited<ReturnType<typeof sendContext>>,
	sent: Awaited<ReturnType<typeof sendWhatsAppText>>,
	body: string,
	messageType: "text" | "template",
	templateMetadata: Record<string, string> = {},
): Promise<InboxSendState | null> {
	const { user, workspace, conversation, admin } = context;
	const now = new Date().toISOString();
	const { data: message, error } = await admin
		.from("messages")
		.insert({
			workspace_id: workspace.id,
			conversation_id: conversation.id,
			direction: "out",
			author_name: user.email || "Equipe",
			body,
			external_message_id: sent.messageId,
			message_type: messageType,
			delivery_status: "pending",
			status_updated_at: now,
			recipient_wa_id: sent.waId,
			sent_at: now,
			metadata: { meta_initial_status: sent.rawStatus, ...templateMetadata },
		})
		.select("id")
		.single();
	if (error || !message) {
		// The provider already accepted this send. Never retry it automatically.
		return {
			accepted: true,
			error:
				"A Meta aceitou o envio, mas o histórico não pôde ser registrado. Atualize a conversa e consulte o administrador antes de reenviar.",
		};
	}
	await admin.from("message_status_events").insert({
		workspace_id: workspace.id,
		message_id: message.id,
		external_message_id: sent.messageId,
		status: "pending",
		occurred_at: now,
		recipient_wa_id: sent.waId,
		metadata: { source: "send_api_response" },
	});
	await admin
		.from("conversations")
		.update({ last_message_at: now, status: "open" })
		.eq("id", conversation.id)
		.eq("workspace_id", workspace.id);
	await admin.from("activities").insert({
		workspace_id: workspace.id,
		actor_user_id: user.id,
		type: "whatsapp_message_sent",
		text: "Mensagem aceita pela API do WhatsApp; aguardando confirmação de entrega.",
		metadata: {
			conversation_id: conversation.id,
			external_message_id: sent.messageId,
			message_type: messageType,
		},
	});
	revalidatePath("/app/inbox");
	revalidatePath("/app/settings/integrations");
	return null;
}

async function sendFailure(
	error: unknown,
	context?: Awaited<ReturnType<typeof sendContext>>,
): Promise<InboxSendState> {
	if (error instanceof InboxInputError) return { error: error.message };
	const code = error instanceof WhatsAppApiError ? error.code : null;
	if (context)
		await context.admin.from("activities").insert({
			workspace_id: context.workspace.id,
			actor_user_id: context.user.id,
			type: "whatsapp_send_failed",
			text: "Falha ao solicitar envio pelo WhatsApp.",
			metadata: { conversation_id: context.conversation.id, error_code: code },
		});
	return {
		error:
			whatsappFailureMessage(
				code,
				"Não foi possível solicitar o envio. Confira a conexão, os templates e as permissões no diagnóstico da Meta.",
			) + (code ? ` (Meta ${code})` : ""),
	};
}

export async function sendInboxMessage(
	_previous: InboxSendState,
	formData: FormData,
): Promise<InboxSendState> {
	let context: Awaited<ReturnType<typeof sendContext>> | undefined;
	try {
		context = await sendContext(formData);
		const body = String(formData.get("body") || "").trim();
		if (!body || body.length > 4096)
			throw new InboxInputError(
				"A mensagem deve ter entre 1 e 4096 caracteres.",
			);
		// The latest inbound is independent of the preview limit. Outbound messages never open this window.
		const { data: inbound, error } = await context.supabase
			.from("messages")
			.select("sent_at")
			.eq("workspace_id", context.workspace.id)
			.eq("conversation_id", context.conversation.id)
			.eq("direction", "in")
			.order("sent_at", { ascending: false })
			.limit(1)
			.maybeSingle();
		if (error)
			throw new InboxInputError(
				"Não foi possível verificar a janela de atendimento. Atualize a conversa.",
			);
		if (!whatsappServiceWindow(inbound?.sent_at || null).open)
			throw new InboxInputError(whatsappFailureMessage("131047"));
		const sent = await sendWhatsAppText({
			phoneNumberId: context.connection.external_resource_id,
			to: context.conversation.external_thread_id,
			text: body,
		});
		const failure = await persistAcceptedMessage(context, sent, body, "text");
		if (failure) return failure;
		return { sentMessageId: sent.messageId };
	} catch (error) {
		if (error instanceof Error && "digest" in error) throw error;
		return sendFailure(error, context);
	}
}

export async function sendInboxTemplate(
	_previous: InboxSendState,
	formData: FormData,
): Promise<InboxSendState> {
	let context: Awaited<ReturnType<typeof sendContext>> | undefined;
	try {
		context = await sendContext(formData);
		const wabaId = context.connection.external_account_id;
		if (!wabaId)
			throw new InboxInputError("A conexão não possui uma WABA configurada.");
		const templateId = String(formData.get("templateId") || "");
		// Refetch the active WABA's approved definition; browser-supplied definitions are never trusted.
		const template = (await getApprovedWhatsAppTemplates(wabaId)).find(
			(item) => item.id === templateId,
		);
		if (!template)
			throw new InboxInputError(
				"Este template não está mais aprovado na WABA atual. Atualize a conversa.",
			);
		const values = Object.fromEntries(
			template.variables.map((variable) => [
				variable.field,
				String(formData.get(variable.field) || ""),
			]),
		);
		let prepared: ReturnType<typeof prepareTemplateMessage>;
		try {
			prepared = prepareTemplateMessage(template, values);
		} catch (error) {
			throw new InboxInputError(
				error instanceof Error
					? error.message
					: "Preencha as variáveis do template.",
			);
		}
		const sent = await sendWhatsAppTemplate({
			phoneNumberId: context.connection.external_resource_id,
			to: context.conversation.external_thread_id,
			name: template.name,
			language: template.language,
			components: prepared.components,
		});
		const failure = await persistAcceptedMessage(
			context,
			sent,
			prepared.body,
			"template",
			{
				template_id: template.id,
				template_name: template.name,
				template_language: template.language,
			},
		);
		if (failure) return failure;
		return { sentMessageId: sent.messageId };
	} catch (error) {
		if (error instanceof Error && "digest" in error) throw error;
		return sendFailure(error, context);
	}
}
