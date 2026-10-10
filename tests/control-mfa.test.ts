import assert from "node:assert/strict";
import test from "node:test";
import {
	controlTotpName,
	prepareControlTotp,
	type MfaFactor,
} from "../lib/control-mfa.ts";

const pending: MfaFactor = {
	id: "incomplete-control-totp",
	factor_type: "totp",
	status: "unverified",
	friendly_name: controlTotpName,
};

function mockMfa(factors: MfaFactor[]) {
	const calls: string[] = [];
	const mfa = {
		async listFactors() {
			calls.push("list");
			return {
				data: { all: factors },
				error: null as { code?: string } | null,
			};
		},
		async unenroll({ factorId }: { factorId: string }) {
			calls.push(`unenroll:${factorId}`);
			return { data: {}, error: null as { code?: string } | null };
		},
		async enroll() {
			calls.push("enroll");
			if (
				factors.some(
					(f) =>
						f.status === "unverified" &&
						f.friendly_name === controlTotpName &&
						!calls.includes(`unenroll:${f.id}`),
				)
			)
				return { data: null, error: { code: "mfa_factor_name_conflict" } };
			return {
				data: {
					id: "new-factor",
					totp: { qr_code: "synthetic-svg", secret: "synthetic-secret" },
				},
				error: null,
			};
		},
	};
	return { mfa, calls };
}

test("an interrupted enrollment can create a new QR without a duplicate-name conflict", async () => {
	const { mfa, calls } = mockMfa([pending]);
	const result = await prepareControlTotp(mfa);
	assert.equal(result.kind, "enroll");
	assert.deepEqual(calls, ["list", `unenroll:${pending.id}`, "enroll"]);
});

test("already verified authenticators go to verification without credential changes", async () => {
	const verified = { ...pending, id: "verified-device", status: "verified" };
	const { mfa, calls } = mockMfa([pending, verified]);
	const result = await prepareControlTotp(mfa);
	assert.deepEqual(result, { kind: "verify", factors: [verified] });
	assert.deepEqual(calls, ["list"]);
});

test("recovery leaves unrelated pending authenticators and other factor types untouched", async () => {
	const { mfa, calls } = mockMfa([
		pending,
		{ ...pending, id: "other-totp", friendly_name: "Other application" },
		{
			...pending,
			id: "phone-factor",
			factor_type: "phone",
			friendly_name: "Phone MFA",
		},
		{ ...pending, id: "unnamed-totp", friendly_name: undefined },
	]);
	await prepareControlTotp(mfa);
	assert.deepEqual(calls, ["list", `unenroll:${pending.id}`, "enroll"]);
});

test("failed factor lookup blocks all changes", async () => {
	const { mfa, calls } = mockMfa([pending]);
	mfa.listFactors = async () => ({
		data: { all: [] },
		error: { code: "session_not_found" },
	});
	await assert.rejects(
		prepareControlTotp(mfa),
		/consultar seus autenticadores/,
	);
	assert.deepEqual(calls, []);
});

test("a failed cleanup cannot create another enrollment", async () => {
	const { mfa, calls } = mockMfa([pending]);
	mfa.unenroll = async () => ({
		data: {},
		error: { code: "insufficient_aal" },
	});
	await assert.rejects(
		prepareControlTotp(mfa),
		/reiniciar a configuração incompleta/,
	);
	assert.deepEqual(calls, ["list"]);
});

test("a fresh account enrolls without removing any factors", async () => {
	const { mfa, calls } = mockMfa([]);
	assert.equal((await prepareControlTotp(mfa)).kind, "enroll");
	assert.deepEqual(calls, ["list", "enroll"]);
});

test("concurrent enrollment conflicts are recoverable and never automatically retried", async () => {
	const { mfa, calls } = mockMfa([]);
	mfa.enroll = async () => {
		calls.push("enroll");
		return { data: null, error: { code: "mfa_factor_name_conflict" } };
	};
	await assert.rejects(prepareControlTotp(mfa), /Atualize a página/);
	assert.deepEqual(calls, ["list", "enroll"]);
});
