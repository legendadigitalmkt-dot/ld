import assert from "node:assert/strict";
import test from "node:test";
import {
	adminReason,
	adminUUID,
	assignableRole,
	controlNavigation,
	controlQuery,
	platformRoles,
	totpImage,
} from "../lib/control-view.ts";
test("administrative mutations require an explicit confirmation and bounded reason", () => {
	assert.throws(() => adminReason("Motivo suficiente", null));
	assert.throws(() => adminReason("Motivo suficiente", true));
	assert.throws(() => adminReason("   curto   ", "confirm"));
	assert.throws(() => adminReason("a".repeat(501), "confirm"));
	assert.equal(
		adminReason("  Aprovação do responsável  ", "confirm"),
		"Aprovação do responsável",
	);
});
test("grant input cannot assign the protected owner or accept a fabricated role", () => {
	for (const input of [
		"platform_owner",
		"owner",
		"super_admin;select",
		undefined,
		["viewer"],
	])
		assert.throws(() => assignableRole(input));
	for (const role of platformRoles.filter((r) => r !== "platform_owner"))
		assert.equal(assignableRole(role), role);
});
test("administrative identifiers reject malformed values and SQL fragments", () => {
	assert.equal(
		adminUUID("84678515-f1a9-4b59-804a-ef96207801fc"),
		"84678515-f1a9-4b59-804a-ef96207801fc",
	);
	for (const value of [
		"all",
		"",
		null,
		["84678515-f1a9-4b59-804a-ef96207801fc"],
		"84678515-f1a9-4b59-804a-ef96207801fc;delete",
	])
		assert.throws(() => adminUUID(value));
});
test("URL filters are bounded and do not coerce repeated or fabricated parameters", () => {
	assert.deepEqual(
		controlQuery({ q: ["a", "b"], page: "-5", status: "deleted" }),
		{ query: "", page: 1, status: "all" },
	);
	assert.deepEqual(
		controlQuery({ q: "  Ana  ", page: "99999", status: "suspended" }),
		{ query: "Ana", page: 10000, status: "suspended" },
	);
	assert.equal(controlQuery({ page: "0" }).page, 1);
	assert.equal(controlQuery({ page: "2;select" }).page, 1);
	assert.equal(controlQuery({ q: "x".repeat(200) }).query.length, 80);
});
test("navigation is filtered by distinct permissions rather than workspace administrator role", () => {
	const viewer = ["platform.access", "overview.read"];
	assert.deepEqual(
		controlNavigation
			.filter((item) => viewer.includes(item.permission))
			.map((item) => item.href),
		["/control-center"],
	);
	assert.equal(
		controlNavigation.find(
			(item) => item.href === "/control-center/permissions",
		)?.permission,
		"roles.read",
	);
});
test("TOTP QR data stays embedded and rejects network URLs", () => {
	const svg = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>';
	assert.equal(
		totpImage(svg),
		`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
	);
	assert.equal(
		totpImage("data:image/svg+xml;base64,PHN2Zy8+"),
		"data:image/svg+xml;base64,PHN2Zy8+",
	);
	for (const qr of ["https://example.com/qr", "javascript:alert(1)", ""])
		assert.throws(() => totpImage(qr));
});
