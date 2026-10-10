import type { Overview } from "./operational";

export type ResultsData = Pick<
	Overview,
	"as_of" | "days" | "stats" | "revenue" | "stages" | "tasks"
>;

export function resultsPeriod(value: unknown): 30 | 90 {
	return value === "90" ? 90 : 30;
}

export function closingResults(stats: ResultsData["stats"]) {
	const total = stats.won_count + stats.lost_count;
	return {
		total,
		conversion: total
			? Math.round((1000 * stats.won_count) / total) / 10
			: null,
	};
}

export function overdueResults(data: ResultsData) {
	return data.tasks.filter(
		(task) => task.due_at && Date.parse(task.due_at) < Date.parse(data.as_of),
	);
}

export function stageDistribution(
	stages: ResultsData["stages"],
	mode: "count" | "value",
) {
	const total = stages.reduce((sum, stage) => sum + stage[mode], 0);
	const maximum = Math.max(...stages.map((stage) => stage[mode]), 0);
	return stages.map((stage) => ({
		...stage,
		share: total ? (100 * stage[mode]) / total : 0,
		width: maximum ? (100 * stage[mode]) / maximum : 0,
	}));
}

// Quote every cell and neutralize formulas, including formulas after whitespace.
function csvCell(value: string | number) {
	const text = String(value);
	const first = [...text].find(
		(character) => character.charCodeAt(0) > 31 && !/\s/.test(character),
	);
	const safe = first && /[=+\-@]/.test(first) ? `'${text}` : text;
	return `"${safe.replaceAll('"', '""')}"`;
}

export function resultsCSV(
	data: ResultsData,
	workspace: string,
	timezone: string,
) {
	const period = `Últimos ${data.days} dias`;
	const closing = closingResults(data.stats);
	const rows: (string | number)[][] = [
		["Workspace", workspace],
		["Atualizado em", data.as_of, "UTC"],
		["Fuso dos dias de fechamento", timezone],
		["Período", data.revenue[0]?.day || "", data.revenue.at(-1)?.day || ""],
		[],
		["Indicador", "Valor", "Escopo"],
		["Oportunidades abertas", data.stats.open_deals, "Situação atual"],
		["Valor do pipeline (BRL)", data.stats.pipeline, "Situação atual"],
		["Vendas ganhas", data.stats.won_count, period],
		["Valor ganho (BRL)", data.stats.won, period],
		["Vendas perdidas", data.stats.lost_count, period],
		["Valor perdido (BRL)", data.stats.lost, period],
		["Oportunidades encerradas", closing.total, period],
		["Conversão de fechamentos (%)", closing.conversion ?? "", period],
		["Ticket médio ganho (BRL)", data.stats.average_ticket, period],
		["Tarefas atrasadas", data.stats.overdue, "Situação atual"],
		["Tarefas abertas", data.stats.open_tasks, "Situação atual"],
		[],
		["Etapa atual", "Oportunidades abertas", "Valor (BRL)"],
		...data.stages.map((stage) => [stage.stage, stage.count, stage.value]),
		[],
		["Dia de fechamento", "Valor ganho (BRL)"],
		...data.revenue.map((day) => [day.day, day.value]),
	];
	return `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
}
