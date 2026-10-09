import assert from "node:assert/strict";
import test from "node:test";
import {
	whatsappServiceWindow,
	whatsappFailureMessage,
	whatsappDeliveryLabel,
} from "../lib/meta/whatsapp-policy.ts";

test("24-hour window is open before the exact deadline and closed at it", () => {
	const inbound = "2026-10-07T23:42:41Z";
	assert.deepEqual(
		whatsappServiceWindow(inbound, Date.parse("2026-10-08T23:42:40.999Z")),
		{ open: true, expiresAt: "2026-10-08T23:42:41.000Z" },
	);
	assert.equal(
		whatsappServiceWindow(inbound, Date.parse("2026-10-08T23:42:41Z")).open,
		false,
	);
	assert.equal(
		whatsappServiceWindow(inbound, Date.parse("2026-10-09T13:05:56Z")).open,
		false,
	);
});
test("unknown, invalid and future inbound timestamps cannot authorize free text", () => {
	const now = Date.parse("2026-10-09T13:00:00Z");
	for (const value of [null, "bad date", "2026-10-09T13:01:00Z"])
		assert.deepEqual(whatsappServiceWindow(value, now), {
			open: false,
			expiresAt: null,
		});
});
test("a new inbound reopens the window regardless of timezone offset", () => {
	assert.equal(
		whatsappServiceWindow(
			"2026-10-09T10:00:00-03:00",
			Date.parse("2026-10-09T13:05:00Z"),
		).open,
		true,
	);
});
test("failure guidance separates the expired window from Meta country restrictions", () => {
	assert.match(whatsappFailureMessage("131047"), /24 horas/);
	assert.match(whatsappFailureMessage("130497"), /país do destinatário/);
	assert.match(whatsappFailureMessage("131030"), /número de teste/);
	assert.match(whatsappFailureMessage("190"), /token/);
	assert.equal(
		whatsappFailureMessage("999", "Original provider detail"),
		"Original provider detail",
	);
});
test("an accepted API response is not presented as delivered", () => {
	assert.match(whatsappDeliveryLabel("pending"), /aguardando status/);
	assert.equal(whatsappDeliveryLabel("delivered"), "Entregue");
	assert.equal(whatsappDeliveryLabel("read"), "Lida");
});
