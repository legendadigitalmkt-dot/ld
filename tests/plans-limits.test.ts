import { test } from "node:test";
import assert from "node:assert/strict";
import {
	planLimit,
	readPlanDraft,
	usageState,
	planLimitError,
} from "../lib/plans-view.ts";
import { visibleAppNavigation } from "../lib/app-navigation.ts";
test("plan ceilings preserve blank, zero and exact integer meaning", () => {
	assert.equal(planLimit(""), null);
	assert.equal(planLimit("0"), 0);
	assert.equal(planLimit("10000000"), 10000000);
	for (const value of [null, 1, "-1", "1.5", "01", "1e3", "10000001", "NaN"]) {
		assert.throws(() => planLimit(value));
	}
});
test("plan draft validates inclusion dependency and exact form limits", () => {
	const form = new FormData();
	form.set("code", "starter");
	form.set("name", "Plano aprovado");
	form.set("description", "");
	form.set("status", "draft");
	for (const key of ["contacts", "deals", "tasks", "members"])
		form.set(key, "");
	form.set("growth_ai", "on");
	assert.throws(() => readPlanDraft(form));
	form.set("crm", "on");
	form.set("contacts", "0");
	const result = readPlanDraft(form);
	assert.equal(result.config.features.growth_ai, true);
	assert.equal(result.config.features.whatsapp, false);
	assert.equal(result.config.limits.contacts, 0);
	assert.equal(result.config.limits.members, null);
	form.set("status", "paid");
	assert.throws(() => readPlanDraft(form));
	form.set("status", "draft");
	form.set("code", "../../owner");
	assert.throws(() => readPlanDraft(form));
});
test("capacity presentation handles overage and retains recovery navigation", () => {
	assert.equal(usageState(4, null), "unconfigured");
	assert.equal(usageState(0, 0), "full");
	assert.equal(usageState(4, 3), "over");
	assert.equal(usageState(1, 3), "available");
	assert.equal(planLimitError("PGL01")?.includes("Plano e consumo"), true);
	assert.equal(planLimitError("42501"), null);
	const links = visibleAppNavigation(false, []);
	assert.ok(links.some((x) => x.href === "/app/settings/plan"));
	assert.ok(!links.some((x) => x.href === "/app/contacts"));
});
