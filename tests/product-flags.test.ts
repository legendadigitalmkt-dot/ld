import assert from "node:assert/strict";
import test from "node:test";
import {
	enabledModules,
	moduleCode,
	ruleRevision,
	ruleState,
	type WorkspaceModules,
} from "../lib/product-view.ts";
import { visibleAppNavigation } from "../lib/app-navigation.ts";

test("flag edits reject unknown modules and state coercion", () => {
	for (const value of [null, "billing", "CRM", ["crm"], "crm;delete"])
		assert.throws(() => moduleCode(value));
	assert.equal(moduleCode("growth_ai"), "growth_ai");
	for (const value of [true, "true", "", null, ["enabled"]])
		assert.throws(() => ruleState(value, true));
	assert.throws(() => ruleState("inherit", false));
	assert.equal(ruleState("inherit", true), "inherit");
	assert.equal(ruleState("beta", false), "beta");
});
test("optimistic revisions reject missing, fractional, negative and unsafe values", () => {
	for (const value of [
		"",
		"-1",
		"1.5",
		"1e2",
		"01",
		"9007199254740992",
		null,
		["1"],
	])
		assert.throws(() => ruleRevision(value, 0));
	assert.equal(ruleRevision("0", 0), 0);
	assert.throws(() => ruleRevision("0", 1));
	assert.equal(ruleRevision("12345", 1), 12345);
});
test("navigation follows effective flags without expanding workspace role permissions", () => {
	const modules: WorkspaceModules = {
		crm: { enabled: false, state: "disabled", source: "global" },
		whatsapp: { enabled: true, state: "beta", source: "workspace" },
		growth_ai: { enabled: false, state: "disabled", source: "dependency" },
	};
	assert.deepEqual(enabledModules(modules), ["whatsapp"]);
	const viewer = visibleAppNavigation(false, enabledModules(modules));
	assert.deepEqual(
		viewer.filter((item) => item.group === "Operação").map((item) => item.href),
		["/app/inbox"],
	);
	assert.ok(!viewer.some((item) => item.admin));
	assert.ok(viewer.some((item) => item.href === "/app/settings/members"));
	assert.ok(!viewer.some((item) => item.href === "/app/start"));
	assert.ok(
		visibleAppNavigation(true, []).some(
			(item) => item.href === "/app/settings",
		),
	);
	assert.equal(
		visibleAppNavigation(true, []).filter((item) => item.module).length,
		0,
	);
});
