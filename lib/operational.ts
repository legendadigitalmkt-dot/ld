export const stageLabels: Record<string, string> = {
	new: "Novo lead",
	contacted: "Em contato",
	qualified: "Qualificado",
	proposal: "Proposta",
	negotiation: "Negociação",
	won: "Ganho",
	lost: "Perdido",
};
export const roleLabels: Record<string, string> = {
	owner: "Proprietário",
	admin: "Administrador",
	sales: "Vendas",
	support: "Atendimento",
	viewer: "Somente leitura",
};
export const priorityLabels: Record<string, string> = {
	low: "Baixa",
	medium: "Média",
	high: "Alta",
};
export const statusLabels: Record<string, string> = {
	lead: "Lead",
	customer: "Cliente",
	inactive: "Inativo",
};
export function money(value: number, fractionDigits = 0) {
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
		maximumFractionDigits: fractionDigits,
	}).format(value);
}
export function dateTime(value: string | null, timezone: string) {
	return value
		? new Intl.DateTimeFormat("pt-BR", {
				timeZone: timezone,
				day: "2-digit",
				month: "2-digit",
				hour: "2-digit",
				minute: "2-digit",
			}).format(new Date(value))
		: "Sem prazo";
}
export type Overview = {
	as_of: string;
	days: number;
	stats: {
		leads: number;
		new_leads: number;
		contacts: number;
		open_deals: number;
		pipeline: number;
		negotiation: number;
		won: number;
		won_count: number;
		lost: number;
		lost_count: number;
		average_ticket: number;
		conversion: number | null;
		forecast: number;
		overdue: number;
		open_tasks: number;
		no_followup: number;
		idle: number;
		risk: number;
		unread: number;
	};
	revenue: { day: string; value: number }[];
	stages: { stage: string; count: number; value: number }[];
	sources: { name: string; count: number }[];
	tasks: {
		id: string;
		title: string;
		priority: string;
		due_at: string | null;
	}[];
	attention: {
		id: string;
		title: string;
		value: number;
		last_activity_at: string;
	}[];
	followups: { id: string; name: string; created_at: string }[];
	activities: { id: string; text: string; created_at: string }[];
};
