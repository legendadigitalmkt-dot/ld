import assert from "node:assert/strict";
import test from "node:test";
import {
	activationProgress,
	activationPath,
	readActivationLead,
} from "../lib/activation.ts";
import {
	crmSuggestion,
	focusDeal,
	growthAIPayload,
	parseGrowthResponse,
} from "../lib/growth-ai.ts";
import {
	mobilePreviewTarget,
	mobilePreviewWidth,
} from "../lib/mobile-preview.ts";
import type { ContactContext } from "../lib/contact-context.ts";
const id = "10000000-0000-4000-8000-000000000001";
const context = {
	contact: {
		id,
		name: "Ana Silva",
		company: "Empresa",
		status: "lead",
		source: "Manual",
		phone: "+5511999999999",
		email: "ana@example.com",
	},
	stats: {
		deals: 2,
		open_deals: 1,
		pipeline: 1500,
		tasks: 0,
		open_tasks: 0,
		overdue: 0,
		conversations: 1,
		history: 1,
		notes: 1,
	},
	deals: [
		{
			id: "d1",
			title: "Proposta",
			stage: "proposal",
			value: 1500,
			last_activity_at: "2026-10-09T12:00:00Z",
		},
		{
			id: "closed",
			title: "Contrato",
			stage: "won",
			value: 3000,
			last_activity_at: "2026-10-10T12:00:00Z",
		},
	],
	tasks: [],
	notes: [
		{
			id: "n1",
			text: "Validar escopo antes de continuar.",
			created_at: "2026-10-09T12:00:00Z",
		},
	],
	history: [
		{
			id: "h1",
			type: "contact_note",
			text: "Revisar escopo",
			created_at: "2026-10-09T12:00:00Z",
		},
	],
	members: [{ id: "member", name: "Owner" }],
	channels: [{ channel: "whatsapp", address: "+5511999999999" }],
	conversations: [{ id: "cv1" }],
} as unknown as ContactContext;
const now = "2026-10-10T12:00:00Z";
test("activation follows records belonging to the selected contact, not workspace totals", () => {
	assert.deepEqual(activationProgress(null), {
		steps: [false, false, false],
		completed: 0,
		ready: false,
	});
	assert.deepEqual(activationProgress(context), {
		steps: [true, true, false],
		completed: 2,
		ready: false,
	});
	assert.equal(
		activationProgress({ ...context, stats: { ...context.stats, tasks: 1 } })
			.ready,
		true,
	);
	assert.equal(
		activationProgress({
			...context,
			stats: { ...context.stats, tasks: 1, deals: 0 },
		}).ready,
		false,
	);
});
test("activation redirects accept only valid contact UUIDs", () => {
	assert.equal(activationPath(id), `/app/start?contact=${id}`);
	for (const raw of [
		"https://evil.test",
		"//evil.test",
		`${id}&next=//evil.test`,
		"not-a-uuid",
	])
		assert.equal(activationPath(raw), "/app/start");
});
test("lead intake validates boundaries and stable retry key", () => {
	const form = new FormData();
	form.set("name", "  Ana  ");
	form.set("intakeKey", id);
	form.set("source", "Manual");
	assert.deepEqual(readActivationLead(form), {
		name: "Ana",
		phone: null,
		source: "Manual",
		intakeKey: id,
	});
	form.set("intakeKey", "");
	assert.throws(() => readActivationLead(form));
	form.set("intakeKey", id);
	form.set("name", "x".repeat(161));
	assert.throws(() => readActivationLead(form));
});
test("CRM suggestion prioritizes pending overdue tasks and quotes the actual note", () => {
	const result = crmSuggestion(
		{
			...context,
			tasks: [
				{
					id: "t1",
					title: "Confirmar escopo",
					status: "open",
					priority: "high",
					due_at: "2026-10-09T12:00:00Z",
				},
			],
		},
		now,
	);
	assert.match(result.nextStep, /Retomar tarefa atrasada: Confirmar escopo/);
	assert.match(result.summary, /Validar escopo antes de continuar/);
	assert.doesNotMatch(result.summary, /aceitou|confirmou|comprou/);
});
test("focus excludes closed deals and respects inactive contacts", () => {
	assert.equal(focusDeal(context)?.id, "d1");
	assert.equal(
		focusDeal({
			...context,
			deals: context.deals.filter((d) => d.stage === "won"),
		}),
		null,
	);
	const suggestion = crmSuggestion(
		{ ...context, contact: { ...context.contact, status: "inactive" } },
		now,
	);
	assert.match(suggestion.nextStep, /deseja retomar/);
	assert.match(suggestion.draft, /encerrar o acompanhamento/);
});
test("external AI context omits direct identifiers and bounds/redacts free text", () => {
	const text =
		"Email ana@example.com telefone +55 (11) 99999-9999 https://example.com/private " +
		"x".repeat(3000);
	const payload = growthAIPayload(
		{
			...context,
			notes: Array.from({ length: 10 }, (_, i) => ({
				id: String(i),
				text,
				actor: "Owner",
				created_at: now,
			})),
		},
		Array.from({ length: 20 }, () => ({
			direction: "in",
			body: text,
			created_at: now,
		})),
		now,
	);
	const raw = JSON.stringify(payload);
	assert.doesNotMatch(
		raw,
		/ana@example.com|5511999999999|member|cv1|https:\/\//,
	);
	assert.equal(payload.notes.length, 5);
	assert.equal(payload.messages.length, 8);
	assert.ok(payload.notes.every((n) => n.text.length <= 600));
	assert.match(raw, /\[email\]/);
	assert.match(raw, /\[telefone\]/);
});
const result = {
	summary: "Há uma proposta para revisar.",
	nextStep: "Revisar escopo",
	draft: "Olá! Podemos alinhar o próximo passo?",
	questions: ["O escopo está definido?"],
};
const envelope = (value: unknown) => ({
	status: "completed",
	output: [
		{
			type: "message",
			content: [{ type: "output_text", text: JSON.stringify(value) }],
		},
	],
});
test("AI accepts only completed structured responses with bounded editable fields", () => {
	assert.deepEqual(parseGrowthResponse(envelope(result)), result);
	assert.throws(() =>
		parseGrowthResponse(envelope({ ...result, nextStep: "x".repeat(181) })),
	);
	assert.throws(() => parseGrowthResponse(envelope({ ...result, draft: 5 })));
	assert.throws(() =>
		parseGrowthResponse(
			envelope({ ...result, questions: Array(4).fill("Pergunta") }),
		),
	);
	assert.throws(() =>
		parseGrowthResponse(envelope({ ...result, url: "https://evil.test" })),
	);
});
test("AI refusal, incomplete output and malformed JSON remain failures", () => {
	assert.throws(() =>
		parseGrowthResponse({ status: "incomplete", output: [] }),
	);
	assert.throws(() =>
		parseGrowthResponse({
			status: "completed",
			output: [{ type: "message", content: [{ type: "refusal" }] }],
		}),
	);
	assert.throws(() =>
		parseGrowthResponse({
			status: "completed",
			output: [
				{
					type: "message",
					content: [{ type: "output_text", text: "not json" }],
				},
			],
		}),
	);
});
test("mobile preview never embeds external routes, recursion, or unvalidated IDs", () => {
	assert.equal(mobilePreviewTarget("pipeline", null), "/app/pipeline");
	assert.equal(mobilePreviewTarget("contact", id), `/app/contacts/${id}`);
	for (const screen of [
		"https://evil.test",
		"//evil.test",
		"/app/mobile-preview",
		"contact",
	])
		assert.equal(mobilePreviewTarget(screen, "bad"), "/app/today");
	assert.equal(mobilePreviewWidth("360"), 360);
	assert.equal(mobilePreviewWidth("430"), 430);
	assert.equal(mobilePreviewWidth("-100"), 390);
});
