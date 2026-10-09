import assert from "node:assert/strict";
import test from "node:test";
import { readContactInput, readContactNote } from "../lib/contact-input.ts";
function profile() {
	const form = new FormData();
	form.set("name", "  Ana Silva  ");
	form.set("source", "Indicação");
	form.set("status", "lead");
	return form;
}
test("contact input trims optional fields and removes repeated tags", () => {
	const form = profile();
	form.set("tags", "prioridade, indicação, prioridade, ,");
	assert.deepEqual(readContactInput(form), {
		name: "Ana Silva",
		company: null,
		email: null,
		phone: null,
		source: "Indicação",
		status: "lead",
		tags: ["prioridade", "indicação"],
		owner: null,
	});
});
test("invalid contact status, owner, email and field length are rejected", () => {
	for (const [key, value] of [
		["status", "owner"],
		["owner", "foreign"],
		["email", "nome@"],
		["name", "A"],
		["company", "x".repeat(161)],
		["source", ""],
	]) {
		const form = profile();
		form.set(key, value);
		assert.throws(() => readContactInput(form));
	}
});
test("tag count and individual length have bounds", () => {
	const form = profile();
	form.set("tags", Array.from({ length: 11 }, (_, i) => `tag${i}`).join(","));
	assert.throws(() => readContactInput(form));
	form.set("tags", "x".repeat(33));
	assert.throws(() => readContactInput(form));
});
test("notes require a bounded body and a valid retry key", () => {
	const form = new FormData();
	form.set("requestId", "aaaaaaaa-1111-4111-8111-111111111111");
	form.set("body", "  Retomar na sexta.  ");
	assert.equal(readContactNote(form).body, "Retomar na sexta.");
	form.set("body", "x".repeat(4001));
	assert.throws(() => readContactNote(form));
	form.set("body", "Nota válida");
	form.set("requestId", "bad");
	assert.throws(() => readContactNote(form));
});
