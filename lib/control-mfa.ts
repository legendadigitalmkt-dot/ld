export const controlTotpName = "Growth OS Control Center";
export class ControlMfaError extends Error {}

export type MfaFactor = {
	id: string;
	factor_type: string;
	status: string;
	friendly_name?: string;
};
type MfaResult<T> = {
	data: T | null;
	error: { code?: string } | null;
};
type Enrollment = {
	id: string;
	totp: { qr_code: string; secret: string };
};
type MfaApi = {
	listFactors(): Promise<MfaResult<{ all: MfaFactor[] }>>;
	unenroll(params: { factorId: string }): Promise<MfaResult<unknown>>;
	enroll(params: {
		factorType: "totp";
		friendlyName: string;
	}): Promise<MfaResult<Enrollment>>;
};

export function pendingControlTotp(factors: MfaFactor[]) {
	return factors.filter(
		(f) =>
			f.factor_type === "totp" &&
			f.status === "unverified" &&
			f.friendly_name === controlTotpName,
	);
}

function enrollmentError(code?: string) {
	if (code === "mfa_factor_name_conflict")
		return "Outra configuração foi iniciada. Atualize a página para continuar.";
	if (code === "over_request_rate_limit" || code === "over_mfa_rate_limit")
		return "Muitas tentativas. Aguarde um momento antes de gerar outro QR code.";
	if (code === "mfa_totp_enroll_not_enabled")
		return "A configuração do autenticador está indisponível. Entre em contato com o suporte.";
	return "Não foi possível iniciar a configuração. Tente novamente.";
}

// Called only after the user explicitly requests configuration/a new QR code.
// Never remove verified factors or incomplete factors belonging to other flows.
export async function prepareControlTotp(mfa: MfaApi) {
	const { data: listed, error: listError } = await mfa.listFactors();
	if (listError || !listed)
		throw new ControlMfaError(
			"Não foi possível consultar seus autenticadores. Atualize a página.",
		);
	const verified = listed.all.filter(
		(f) => f.factor_type === "totp" && f.status === "verified",
	);
	if (verified.length) return { kind: "verify" as const, factors: verified };

	for (const factor of pendingControlTotp(listed.all)) {
		const { error } = await mfa.unenroll({ factorId: factor.id });
		if (error)
			throw new ControlMfaError(
				"Não foi possível reiniciar a configuração incompleta. Atualize a página e tente novamente.",
			);
	}
	const { data, error } = await mfa.enroll({
		factorType: "totp",
		friendlyName: controlTotpName,
	});
	if (error || !data) throw new ControlMfaError(enrollmentError(error?.code));
	return { kind: "enroll" as const, enrollment: data };
}
