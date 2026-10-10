import assert from "node:assert/strict";
import test from "node:test";
import { mobilePreviewTarget } from "../lib/mobile-preview.ts";
import { money } from "../lib/operational.ts";
import {
	closingResults,
	overdueResults,
	type ResultsData,
	resultsCSV,
	resultsPeriod,
	stageDistribution,
} from "../lib/results-view.ts";

const data: ResultsData = {
	as_of: "2026-10-10T09:00:00Z",
	days: 30,
	stats: {
		leads: 20,
		new_leads: 10,
		contacts: 40,
		open_deals: 5,
		pipeline: 3000.25,
		negotiation: 0,
		won: 1500.75,
		won_count: 2,
		lost: 500,
		lost_count: 1,
		average_ticket: 750.375,
		conversion: 66.7,
		forecast: 1000,
		overdue: 1,
		open_tasks: 4,
		no_followup: 0,
		idle: 0,
		risk: 0,
		unread: 0,
	},
	revenue: [
		{ day: "2026-09-11", value: 0 },
		{ day: "2026-10-10", value: 1500.75 },
	],
	stages: [
		{ stage: "new", count: 4, value: 1000 },
		{ stage: "proposal", count: 1, value: 2000.25 },
	],
	tasks: [
		{
			id: "overdue",
			title: "Retomar conversa",
			priority: "high",
			due_at: "2026-10-10T08:59:59Z",
		},
		{
			id: "boundary",
			title: "Prazo exato",
			priority: "medium",
			due_at: "2026-10-10T09:00:00Z",
		},
		{
			id: "future",
			title: "Amanhã",
			priority: "medium",
			due_at: "2026-10-11T09:00:00Z",
		},
		{ id: "no-date", title: "Sem prazo", priority: "low", due_at: null },
	],
};

test("results accepts only supported single-value periods", () => {
	assert.equal(resultsPeriod("90"), 90);
	for (const value of ["30", "7", "999", "90;select", ["90"], undefined, null])
		assert.equal(resultsPeriod(value), 30);
});

test("conversion uses closed opportunities and distinguishes no closures from losses", () => {
	assert.deepEqual(closingResults(data.stats), { total: 3, conversion: 66.7 });
	assert.deepEqual(
		closingResults({ ...data.stats, won_count: 0, lost_count: 0 }),
		{ total: 0, conversion: null },
	);
	assert.deepEqual(
		closingResults({ ...data.stats, won_count: 0, lost_count: 3 }),
		{ total: 3, conversion: 0 },
	);
	assert.deepEqual(
		closingResults({ ...data.stats, won_count: 1, lost_count: 0 }),
		{ total: 1, conversion: 100 },
	);
});

test("stage distribution uses selected unit without assuming a decreasing funnel", () => {
	const counts = stageDistribution(data.stages, "count");
	assert.equal(counts[0].share, 80);
	assert.equal(counts[1].share, 20);
	assert.equal(counts[1].width, 25);
	const values = stageDistribution(data.stages, "value");
	assert.equal(values[1].width, 100);
	assert.ok(values[1].share > values[0].share);
	assert.ok(
		Math.abs(values.reduce((sum, item) => sum + item.share, 0) - 100) < 0.00001,
	);
});

test("unvalued and empty stages produce zero bars and never NaN percentages", () => {
	assert.deepEqual(stageDistribution([], "count"), []);
	for (const mode of ["count", "value"] as const) {
		const result = stageDistribution(
			[{ stage: "new", count: 0, value: 0 }],
			mode,
		);
		assert.equal(result[0].width, 0);
		assert.equal(result[0].share, 0);
	}
});

test("overdue list excludes future, exact-deadline and undated tasks using snapshot time", () => {
	assert.deepEqual(
		overdueResults(data).map((task) => task.id),
		["overdue"],
	);
	assert.deepEqual(overdueResults({ ...data, tasks: [] }), []);
});

test("CSV contains current versus period scopes, cents, closure denominator and workspace dates", () => {
	const csv = resultsCSV(data, 'Equipe "Vendas"', "America/Sao_Paulo");
	assert.ok(csv.startsWith("\uFEFF"));
	assert.ok(csv.includes('"Workspace";"Equipe ""Vendas"""'));
	assert.ok(csv.includes('"Período";"2026-09-11";"2026-10-10"'));
	assert.ok(csv.includes('"Oportunidades encerradas";"3";"Últimos 30 dias"'));
	assert.ok(
		csv.includes('"Conversão de fechamentos (%)";"66.7";"Últimos 30 dias"'),
	);
	assert.ok(csv.includes('"Tarefas atrasadas";"1";"Situação atual"'));
	assert.ok(csv.includes('"2026-10-10";"1500.75"'));
	assert.ok(
		resultsCSV(
			{ ...data, stats: { ...data.stats, won_count: 0, lost_count: 0 } },
			"Workspace",
			"UTC",
		).includes('"Conversão de fechamentos (%)";"";'),
	);
});

test("CSV neutralizes spreadsheet formulas in text, including leading whitespace", () => {
	for (const name of [
		"=HYPERLINK(1)",
		"+SUM(1)",
		"-1+1",
		"@SUM(1)",
		" \t=SUM(1)",
		"\n=SUM(1)",
		"\u0000=SUM(1)",
	])
		assert.ok(resultsCSV(data, name, "UTC").includes(`"'${name}"`));
	assert.ok(
		resultsCSV(data, "Legenda Digital", "UTC").includes(
			'"Workspace";"Legenda Digital"',
		),
	);
});

test("financial detail preserves cents and results is an allowed mobile QA target", () => {
	assert.match(money(1500.75, 2), /1\.500,75/);
	assert.match(money(1500.75), /1\.501/);
	assert.equal(mobilePreviewTarget("results", null), "/app/results");
	assert.equal(mobilePreviewTarget("/app/results?evil=1", null), "/app/today");
});
