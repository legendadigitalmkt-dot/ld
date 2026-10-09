import assert from "node:assert/strict";
import test from "node:test";
import { readWorkspaceInput } from "../lib/workspace-input.ts";
test("workspace profile trims input and accepts the current Brazilian timezone", () => {
	const f = new FormData();
	f.set("name", " Legenda Digital ");
	f.set("segment", "");
	f.set("timezone", "America/Sao_Paulo");
	assert.deepEqual(readWorkspaceInput(f), {
		name: "Legenda Digital",
		segment: null,
		timezone: "America/Sao_Paulo",
	});
});
test("workspace input rejects names, segment overflow and an unknown timezone", () => {
	for (const [key, value] of [
		["name", "x"],
		["name", "x".repeat(121)],
		["segment", "x".repeat(161)],
		["timezone", "invalid-zone"],
	]) {
		const f = new FormData();
		f.set("name", "Equipe");
		f.set("timezone", "UTC");
		f.set(key, value);
		assert.throws(() => readWorkspaceInput(f));
	}
});
