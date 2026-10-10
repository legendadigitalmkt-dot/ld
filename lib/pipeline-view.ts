export type PipelineStage =
	| "new"
	| "contacted"
	| "qualified"
	| "proposal"
	| "negotiation"
	| "won"
	| "lost";
export type PipelineDeal = {
	id: string;
	title: string;
	stage: PipelineStage;
	value: number;
	probability: number;
	last_activity_at: string;
	contact_id: string;
	contact_name: string;
	company: string | null;
	source: string;
};
export const pipelineStages: {
	id: PipelineStage;
	label: string;
	probability: number;
	color: string;
}[] = [
	{ id: "new", label: "Novo lead", probability: 20, color: "#7c9aff" },
	{ id: "contacted", label: "Em contato", probability: 30, color: "#00d9ff" },
	{ id: "qualified", label: "Qualificado", probability: 50, color: "#50dec1" },
	{ id: "proposal", label: "Proposta", probability: 70, color: "#b699ff" },
	{ id: "negotiation", label: "Negociação", probability: 85, color: "#ff91d6" },
	{ id: "won", label: "Ganho", probability: 100, color: "#4ade80" },
	{ id: "lost", label: "Perdido", probability: 0, color: "#ff8da4" },
];
export function isOpenDeal(deal: Pick<PipelineDeal, "stage">) {
	return deal.stage !== "won" && deal.stage !== "lost";
}
export function isIdleDeal(
	deal: Pick<PipelineDeal, "stage" | "last_activity_at">,
	asOf: string,
) {
	return (
		isOpenDeal(deal) &&
		Date.parse(asOf) - Date.parse(deal.last_activity_at) >= 24 * 60 * 60 * 1000
	);
}
export function pipelineSummary(deals: PipelineDeal[], asOf: string) {
	const open = deals.filter(isOpenDeal);
	return {
		count: open.length,
		value: open.reduce((sum, deal) => sum + deal.value, 0),
		forecast: open.reduce(
			(sum, deal) => sum + (deal.value * deal.probability) / 100,
			0,
		),
		idle: open.filter((deal) => isIdleDeal(deal, asOf)).length,
	};
}
export function filterPipeline(
	deals: PipelineDeal[],
	filters: { query: string; stage: string; idle: boolean; sort: string },
	asOf: string,
) {
	const query = filters.query
		.trim()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLocaleLowerCase("pt-BR");
	return deals
		.filter((deal) => {
			const text =
				`${deal.title} ${deal.contact_name} ${deal.company || ""} ${deal.source}`
					.normalize("NFD")
					.replace(/[\u0300-\u036f]/g, "")
					.toLocaleLowerCase("pt-BR");
			return (
				(!query || text.includes(query)) &&
				(filters.stage === "all" ||
					(filters.stage === "open"
						? isOpenDeal(deal)
						: deal.stage === filters.stage)) &&
				(!filters.idle || isIdleDeal(deal, asOf))
			);
		})
		.sort((a, b) =>
			filters.sort === "value"
				? b.value - a.value
				: filters.sort === "oldest"
					? Date.parse(a.last_activity_at) - Date.parse(b.last_activity_at)
					: Date.parse(b.last_activity_at) - Date.parse(a.last_activity_at),
		);
}
export function parseDealValue(raw: string) {
	const value = raw.trim();
	if (
		value.includes(",") &&
		!/^(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/.test(value)
	)
		return null;
	const normalized = value.includes(",")
		? value.replace(/\./g, "").replace(",", ".")
		: value;
	if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
	const number = Number(normalized);
	return Number.isFinite(number) && number >= 0 && number < 1_000_000_000_000
		? number
		: null;
}
