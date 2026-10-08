import assert from "node:assert/strict";
import test from "node:test";
import { escapeSearch, selectWorkspace } from "../lib/workspace-selection.ts";
import { deadlineAtEndOfDay, readTaskInput } from "../lib/task-input.ts";

test("workspace selection ignores a forged or removed workspace cookie", () => {
	const allowed = [
		{ id: "a", role: "viewer" },
		{ id: "b", role: "owner" },
	];
	assert.equal(selectWorkspace(allowed, "b")?.id, "b");
	assert.equal(selectWorkspace(allowed, "foreign")?.id, "a");
	assert.equal(selectWorkspace([], "foreign"), null);
});
test("search treats SQL pattern metacharacters as literal user input", () => {
	assert.equal(escapeSearch("  50%_\\promo  "), "50\\%\\_\\\\promo");
	assert.equal(escapeSearch("x".repeat(100)).length, 80);
});
test("deadlines use the workspace day rather than server timezone", () => {
	assert.equal(
		deadlineAtEndOfDay("2026-10-08", "America/Sao_Paulo"),
		"2026-10-09T02:59:59.999Z",
	);
	assert.equal(
		deadlineAtEndOfDay("2026-10-08", "Asia/Tokyo"),
		"2026-10-08T14:59:59.999Z",
	);
});
test("deadline conversion handles daylight saving boundaries", () => {
	assert.equal(
		deadlineAtEndOfDay("2026-11-01", "America/New_York"),
		"2026-11-02T04:59:59.999Z",
	);
	assert.equal(
		deadlineAtEndOfDay("2026-03-08", "America/New_York"),
		"2026-03-09T03:59:59.999Z",
	);
});
test("invalid dates cannot become normalized deadlines", () => {
	assert.throws(() => deadlineAtEndOfDay("2026-02-30", "America/Sao_Paulo"));
	assert.throws(() => deadlineAtEndOfDay("not-a-date", "America/Sao_Paulo"));
});
test("task validation rejects invalid priorities and trims titles", () => {
	const form = new FormData();
	form.set("title", "  Retomar proposta  ");
	form.set("priority", "high");
	assert.deepEqual(readTaskInput(form, "America/Sao_Paulo"), {
		title: "Retomar proposta",
		priority: "high",
		due_at: null,
	});
	form.set("priority", "admin");
	assert.throws(() => readTaskInput(form, "America/Sao_Paulo"));
	form.set("priority", "medium");
	form.set("title", "x");
	assert.throws(() => readTaskInput(form, "America/Sao_Paulo"));
});
