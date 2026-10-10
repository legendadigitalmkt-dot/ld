import assert from "node:assert/strict";
import test from "node:test";
import {
	filterPipeline,
	isIdleDeal,
	parseDealValue,
	pipelineSummary,
	type PipelineDeal,
} from "../lib/pipeline-view.ts";
const asOf = "2026-10-10T12:00:00Z";
const base: PipelineDeal = {
	id: "a",
	title: "Proposta de conteúdo",
	stage: "proposal",
	value: 1000,
	probability: 70,
	last_activity_at: "2026-10-09T12:00:00Z",
	contact_id: "c",
	contact_name: "João",
	company: "Clínica",
	source: "WhatsApp",
};
const deals: PipelineDeal[] = [
	base,
	{ ...base, id: "b", stage: "won", value: 5000, probability: 100 },
	{ ...base, id: "d", stage: "lost", value: 3000, probability: 0 },
	{
		...base,
		id: "e",
		stage: "new",
		value: 500,
		probability: 20,
		last_activity_at: asOf,
		contact_name: "Ana",
		company: "Loja",
	},
];
test("forecast excludes won and lost deals and uses each deal probability", () => {
	assert.deepEqual(pipelineSummary(deals, asOf), {
		count: 2,
		value: 1500,
		forecast: 800,
		idle: 1,
	});
});
test("attention boundary is exactly 24h and closed deals are excluded", () => {
	assert.equal(isIdleDeal(base, asOf), true);
	assert.equal(
		isIdleDeal({ ...base, last_activity_at: "2026-10-09T12:00:01Z" }, asOf),
		false,
	);
	assert.equal(isIdleDeal({ ...base, stage: "won" }, asOf), false);
});
test("filters combine accent insensitive context search, stage and attention without mutating data", () => {
	const before = JSON.stringify(deals);
	assert.deepEqual(
		filterPipeline(
			deals,
			{ query: "clinica", stage: "open", idle: true, sort: "value" },
			asOf,
		).map((deal) => deal.id),
		["a"],
	);
	assert.deepEqual(
		filterPipeline(
			deals,
			{ query: "joao", stage: "won", idle: false, sort: "recent" },
			asOf,
		).map((deal) => deal.id),
		["b"],
	);
	assert.equal(JSON.stringify(deals), before);
});
test("empty forecast is zero, not fabricated conversion or revenue", () => {
	assert.deepEqual(pipelineSummary([], asOf), {
		count: 0,
		value: 0,
		forecast: 0,
		idle: 0,
	});
});
test("value input supports BR decimals and rejects precision and database overflow", () => {
	assert.equal(parseDealValue("1.234,56"), 1234.56);
	assert.equal(parseDealValue("1234.56"), 1234.56);
	assert.equal(parseDealValue("0"), 0);
	for (const raw of [
		"",
		"-1",
		"1,2,3",
		"1.2,3",
		"12.34,56",
		"1.2345",
		"Infinity",
		"1000000000000",
		"abc",
	])
		assert.equal(parseDealValue(raw), null, raw);
});
