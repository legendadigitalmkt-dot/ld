import type { ContactContext } from "./contact-context";

export type GrowthSuggestion = {
	summary: string;
	nextStep: string;
	draft: string;
	questions: string[];
};
export type BriefMessage = {
	direction: string;
	body: string;
	created_at: string;
	delivery_status?: string | null;
};
export type GrowthAIState = {
	result?: GrowthSuggestion;
	error?: string;
	generatedAt?: string;
};
const stages: Record<string, string> = {
	new: "Novo lead",
	contacted: "Em contato",
	qualified: "Qualificado",
	proposal: "Proposta",
	negotiation: "Negociação",
	won: "Ganho",
	lost: "Perdido",
};
const ranks: Record<string, number> = {
	new: 1,
	contacted: 2,
	qualified: 3,
	proposal: 4,
	negotiation: 5,
};
export function focusDeal(context: ContactContext) {
	return (
		[...context.deals]
			.filter((d) => d.stage !== "won" && d.stage !== "lost")
			.sort(
				(a, b) =>
					(ranks[b.stage] || 0) - (ranks[a.stage] || 0) ||
					b.value - a.value ||
					a.id.localeCompare(b.id),
			)[0] || null
	);
}
export function crmSuggestion(
	context: ContactContext,
	now: string,
): GrowthSuggestion {
	const deal = focusDeal(context);
	const first = context.contact.name.trim().split(/\s+/)[0] || "Olá";
	const overdue = context.tasks.find(
		(t) =>
			t.status === "open" && t.due_at && Date.parse(t.due_at) < Date.parse(now),
	);
	const task = overdue || context.tasks.find((t) => t.status === "open");
	const actions: Record<string, string> = {
		new: `Fazer primeiro contato com ${context.contact.name}`,
		contacted: `Qualificar interesse de ${context.contact.name}`,
		qualified: `Definir escopo com ${context.contact.name}`,
		proposal: `Retomar proposta com ${context.contact.name}`,
		negotiation: `Confirmar próximos passos com ${context.contact.name}`,
	};
	const nextStep = task
		? `${overdue ? "Retomar tarefa atrasada" : "Concluir próxima tarefa"}: ${task.title}`
		: context.contact.status === "inactive"
			? `Confirmar se ${context.contact.name} deseja retomar o contato`
			: deal
				? actions[deal.stage] ||
					`Definir próximo passo com ${context.contact.name}`
				: context.contact.status === "customer"
					? `Acompanhar a experiência de ${context.contact.name}`
					: `Definir próximo passo com ${context.contact.name}`;
	const summaries = [
		`${context.contact.name}${context.contact.company ? `, de ${context.contact.company}` : ""}.`,
		`${context.stats.open_deals} oportunidade(s) aberta(s) e ${context.stats.open_tasks} tarefa(s) pendente(s).`,
		deal
			? `A oportunidade em foco está em ${stages[deal.stage] || deal.stage}.`
			: "Sem oportunidade aberta neste momento.",
		context.stats.overdue
			? `${context.stats.overdue} tarefa(s) com prazo vencido.`
			: "",
		context.notes[0]
			? `Última nota: ${context.notes[0].text.slice(0, 420)}`
			: "Nenhuma nota registrada.",
	];
	const drafts: Record<string, string> = {
		new: `Olá, ${first}! Gostaria de entender o que você quer melhorar hoje em marketing ou vendas. Qual é sua principal prioridade?`,
		contacted: `Olá, ${first}! Para definir um próximo passo útil, qual resultado você gostaria de alcançar e o que mais dificulta esse avanço hoje?`,
		qualified: `Olá, ${first}! Podemos alinhar o objetivo, o escopo e o prazo para avaliar juntos o próximo passo?`,
		proposal: `Olá, ${first}! Podemos conversar sobre a proposta e esclarecer suas dúvidas? Qual ponto você gostaria de revisar primeiro?`,
		negotiation: `Olá, ${first}! Podemos alinhar os pontos que ainda precisam de confirmação e combinar o próximo passo?`,
	};
	return {
		summary: summaries.filter(Boolean).join(" "),
		nextStep: nextStep.slice(0, 180),
		draft:
			context.contact.status === "inactive"
				? `Olá, ${first}! Ainda faz sentido conversarmos sobre suas prioridades? Se preferir, podemos encerrar o acompanhamento por aqui.`
				: deal
					? drafts[deal.stage] || drafts.new
					: context.contact.status === "customer"
						? `Olá, ${first}! Como está sua experiência até aqui? Há algo em que podemos ajudar neste momento?`
						: `Olá, ${first}! Qual seria o próximo passo mais útil para você neste momento?`,
		questions: context.stats.notes
			? [
					"A última nota continua válida?",
					"Existe algum compromisso que precisa ser confirmado?",
				]
			: [
					"Qual problema o contato quer resolver?",
					"Qual prazo e próximo passo foram combinados?",
				],
	};
}

// Minimize and bound the external context. Names, email, phone, members and IDs are omitted.
export function growthAIPayload(
	context: ContactContext,
	messages: BriefMessage[],
	now: string,
) {
	const redact = (text: string, max: number) =>
		text
			.replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, "[email]")
			.replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, "[telefone]")
			.replace(/https?:\/\/[^\s]+/gi, "[link]")
			.slice(0, max);
	return {
		asOf: now,
		contact: {
			status: context.contact.status,
			source: redact(context.contact.source, 80),
		},
		stats: context.stats,
		deals: context.deals.slice(0, 8).map((d) => ({
			title: redact(d.title, 180),
			stage: d.stage,
			value: d.value,
			lastActivity: d.last_activity_at,
		})),
		tasks: context.tasks.slice(0, 8).map((t) => ({
			title: redact(t.title, 180),
			status: t.status,
			priority: t.priority,
			dueAt: t.due_at,
		})),
		notes: context.notes
			.slice(0, 5)
			.map((n) => ({ text: redact(n.text, 600), at: n.created_at })),
		history: context.history.slice(0, 10).map((h) => ({
			type: h.type,
			text: redact(h.text, 300),
			at: h.created_at,
		})),
		messages: messages.slice(0, 8).map((m) => ({
			direction: m.direction,
			deliveryStatus: m.delivery_status || null,
			text: redact(m.body, 600),
			at: m.created_at,
		})),
	};
}
export const growthAISchema = {
	type: "object",
	additionalProperties: false,
	required: ["summary", "nextStep", "draft", "questions"],
	properties: {
		summary: { type: "string" },
		nextStep: { type: "string" },
		draft: { type: "string" },
		questions: { type: "array", items: { type: "string" } },
	},
};
export function parseGrowthResponse(value: unknown): GrowthSuggestion {
	if (!value || typeof value !== "object")
		throw new Error("Resposta inválida.");
	const response = value as {
		status?: string;
		output?: { type?: string; content?: { type?: string; text?: string }[] }[];
	};
	if (response.status !== "completed" || !Array.isArray(response.output))
		throw new Error("A IA não concluiu a resposta.");
	const content = response.output
		.filter((i) => i.type === "message")
		.flatMap((i) => i.content || []);
	if (content.some((i) => i.type === "refusal"))
		throw new Error("A IA não pôde preparar esta resposta.");
	const raw = content
		.filter((i) => i.type === "output_text")
		.map((i) => i.text || "")
		.join("");
	if (raw.length > 10000) throw new Error("Resposta acima do limite.");
	const result = JSON.parse(raw) as GrowthSuggestion;
	if (
		!result ||
		typeof result !== "object" ||
		Object.keys(result).sort().join(",") !==
			"draft,nextStep,questions,summary" ||
		!["summary", "nextStep", "draft"].every(
			(k) =>
				typeof result[k as keyof GrowthSuggestion] === "string" &&
				String(result[k as keyof GrowthSuggestion]).trim().length > 1,
		) ||
		result.summary.length > 2400 ||
		result.nextStep.length > 180 ||
		result.draft.length > 2000 ||
		!Array.isArray(result.questions) ||
		result.questions.length > 3 ||
		result.questions.some((q) => typeof q !== "string" || q.length > 240)
	)
		throw new Error("A resposta não atende ao formato de revisão.");
	return result;
}
