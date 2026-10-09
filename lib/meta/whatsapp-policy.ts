export const serviceWindowMs = 24 * 60 * 60 * 1000;

export function whatsappServiceWindow(
	lastInboundAt: string | null,
	now = Date.now(),
) {
	const receivedAt = lastInboundAt ? Date.parse(lastInboundAt) : Number.NaN;
	if (
		!Number.isFinite(receivedAt) ||
		!Number.isFinite(now) ||
		receivedAt > now
	) {
		return { open: false, expiresAt: null };
	}
	const expiresAt = receivedAt + serviceWindowMs;
	return {
		open: now < expiresAt,
		expiresAt: new Date(expiresAt).toISOString(),
	};
}

export class WhatsAppApiError extends Error {
	code: string | null;
	constructor(message: string, code: string | null) {
		super(message);
		this.name = "WhatsAppApiError";
		this.code = code;
	}
}

export function whatsappFailureMessage(
	code: string | null,
	fallback?: string | null,
) {
	switch (code) {
		case "131047":
			return "A janela de atendimento de 24 horas terminou. Envie um template aprovado ou aguarde uma nova mensagem do contato.";
		case "130497":
			return "A Meta restringiu esta conta para envios ao país do destinatário. Verifique a restrição da WABA no WhatsApp Manager; reconectar o canal não remove essa restrição.";
		case "131030":
			return "O destinatário não está autorizado para este número de teste. Cadastre e valide o destinatário na configuração da API na Meta.";
		case "190":
			return "O token da Meta está inválido ou expirou. Um administrador deve atualizar a credencial no servidor e validar a conexão.";
		default:
			return (
				fallback?.trim() ||
				"A Meta não confirmou a entrega. Verifique o diagnóstico do canal e o erro retornado antes de tentar novamente."
			);
	}
}

export function whatsappDeliveryLabel(status: string | null) {
	const labels: Record<string, string> = {
		pending: "Aceita pela API · aguardando status",
		sent: "Enviada",
		delivered: "Entregue",
		read: "Lida",
		failed: "Falhou",
		deleted: "Excluída",
	};
	return labels[status || "pending"] || "Aguardando status";
}
