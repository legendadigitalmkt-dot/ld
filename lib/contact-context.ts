import type { Database } from "./database.types";
export type ContactActionState = { error: string | null };
export type ContactContext = {
	contact: Database["public"]["Tables"]["contacts"]["Row"];
	members: { id: string; name: string | null; role: string }[];
	stats: {
		deals: number;
		open_deals: number;
		pipeline: number;
		tasks: number;
		open_tasks: number;
		overdue: number;
		conversations: number;
		history: number;
		notes: number;
	};
	deals: {
		id: string;
		title: string;
		stage: string;
		value: number;
		last_activity_at: string;
	}[];
	tasks: {
		id: string;
		title: string;
		status: string;
		priority: string;
		due_at: string | null;
	}[];
	conversations: {
		id: string;
		channel: string;
		status: string;
		unread_count: number;
		last_message_at: string | null;
	}[];
	channels: { channel: string; address: string }[];
	history_page: number;
	history: {
		id: string;
		type: string;
		text: string;
		actor: string | null;
		created_at: string;
	}[];
	notes: {
		id: string;
		text: string;
		actor: string | null;
		created_at: string;
	}[];
};
export const activityLabels: Record<string, string> = {
	contact_note: "Nota",
	contact_updated: "Perfil atualizado",
	lead_created: "Novo lead",
	task_created: "Tarefa criada",
	task_status_changed: "Tarefa atualizada",
	deal_stage_changed: "Etapa alterada",
	deal_value_changed: "Valor alterado",
	whatsapp_message_sent: "Mensagem enviada",
	whatsapp_send_failed: "Falha de envio",
	whatsapp_message_received: "Mensagem recebida",
};
