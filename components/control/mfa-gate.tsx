"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/client";
import { totpImage } from "@/lib/control-view";
import {
	ControlMfaError,
	pendingControlTotp,
	prepareControlTotp,
} from "@/lib/control-mfa";
import styles from "./control.module.css";
type Factor = { id: string; friendly_name?: string };
export function MfaGate() {
	const router = useRouter();
	const [factors, setFactors] = useState<Factor[]>([]);
	const [factorId, setFactorId] = useState("");
	const [enrollment, setEnrollment] = useState<{
		qr: string;
		secret: string;
	} | null>(null);
	const [code, setCode] = useState("");
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [hasPending, setHasPending] = useState(false);
	const [factorsLoaded, setFactorsLoaded] = useState(false);
	const enrollmentBusy = useRef(false);
	useEffect(() => {
		let active = true;
		const load = async () => {
			try {
				const { data, error: failure } =
					await createClient().auth.mfa.listFactors();
				if (!active) return;
				if (failure) {
					setError(
						"Não foi possível consultar seus autenticadores. Atualize a página.",
					);
					return;
				}
				const verified = data.totp.filter((f) => f.status === "verified");
				setFactors(verified);
				setFactorId(verified[0]?.id ?? "");
				setHasPending(pendingControlTotp(data.all).length > 0);
				setFactorsLoaded(true);
			} catch {
				if (active) setError("Não foi possível consultar seus autenticadores.");
			} finally {
				if (active) setLoading(false);
			}
		};
		void load();
		return () => {
			active = false;
		};
	}, []);
	async function enroll() {
		if (enrollmentBusy.current) return;
		enrollmentBusy.current = true;
		setBusy(true);
		setError("");
		setEnrollment(null);
		setFactorId("");
		setCode("");
		try {
			const result = await prepareControlTotp(createClient().auth.mfa);
			if (result.kind === "verify") {
				setFactors(result.factors);
				setFactorId(result.factors[0].id);
				return;
			}
			const data = result.enrollment;
			setFactorId(data.id);
			setHasPending(true);
			setEnrollment({
				qr: totpImage(data.totp.qr_code),
				secret: data.totp.secret,
			});
		} catch (failure) {
			setError(
				failure instanceof ControlMfaError
					? failure.message
					: "Não foi possível iniciar a configuração.",
			);
		} finally {
			enrollmentBusy.current = false;
			setBusy(false);
		}
	}
	async function verify(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!factorId || !/^\d{6}$/.test(code)) return;
		setBusy(true);
		setError("");
		try {
			const { error: failure } =
				await createClient().auth.mfa.challengeAndVerify({ factorId, code });
			if (failure) {
				setError(
					"Código inválido ou expirado. Use o código atual do autenticador.",
				);
				return;
			}
			setCode("");
			setEnrollment(null);
			router.replace("/control-center");
			router.refresh();
		} catch {
			setError("Não foi possível verificar o código. Tente novamente.");
		} finally {
			setBusy(false);
		}
	}
	return (
		<main className={styles.gate}>
			<section className={styles.gateCard}>
				<span className={styles.gateIcon}>
					<Icon name="shield" />
				</span>
				<h1>Verifique seu acesso</h1>
				<p>
					O Control Center exige autenticação em duas etapas. Use seu aplicativo
					autenticador para confirmar esta sessão.
				</p>
				{loading ? (
					<p role="status">Consultando autenticadores…</p>
				) : factors.length === 0 && !enrollment ? (
					<>
						<p>
							Configure um autenticador, como Google Authenticator, Microsoft
							Authenticator ou 1Password.
						</p>
						{hasPending ? (
							<p>
								Existe uma configuração incompleta. Gere um novo QR code para
								recomeçar; os códigos da tentativa anterior deixarão de
								funcionar.
							</p>
						) : null}
						<button
							type="button"
							className={styles.button}
							disabled={busy || !factorsLoaded}
							onClick={enroll}
						>
							{busy
								? "Preparando…"
								: hasPending
									? "Gerar novo QR code"
									: "Configurar autenticador"}
						</button>
					</>
				) : null}
				{enrollment ? (
					<>
						<p>
							Escaneie o QR code no autenticador e digite o código de seis
							dígitos.
						</p>
						{/* biome-ignore lint/performance/noImgElement: TOTP remains a transient embedded image and must not enter the image optimizer. */}
						<img
							className={styles.qr}
							src={enrollment.qr}
							alt="QR code para configurar seu autenticador"
							width={210}
							height={210}
						/>
						<details>
							<summary>Inserir chave manualmente</summary>
							<code className={styles.manualSecret}>{enrollment.secret}</code>
						</details>
						<p>
							Se precisar recomeçar, gere outro QR code e use somente a nova
							configuração no autenticador.
						</p>
						<button
							type="button"
							className={styles.button}
							disabled={busy}
							onClick={enroll}
						>
							Gerar novo QR code
						</button>
					</>
				) : null}
				{factorId ? (
					<form onSubmit={verify}>
						{factors.length > 1 ? (
							<label>
								Autenticador
								<select
									value={factorId}
									onChange={(e) => setFactorId(e.target.value)}
								>
									{factors.map((f) => (
										<option key={f.id} value={f.id}>
											{f.friendly_name || "Autenticador"}
										</option>
									))}
								</select>
							</label>
						) : null}
						<label>
							Código do autenticador
							<input
								inputMode="numeric"
								autoComplete="one-time-code"
								pattern="[0-9]{6}"
								maxLength={6}
								required
								value={code}
								onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
							/>
						</label>
						<button
							type="submit"
							className={styles.button}
							disabled={busy || code.length !== 6}
						>
							{busy ? "Verificando…" : "Confirmar acesso"}
						</button>
					</form>
				) : null}
				{error ? (
					<p role="alert" className={styles.error}>
						{error}
					</p>
				) : null}
				<p>
					O QR code e a chave são exclusivos da sua conta. Mantenha-os no seu
					autenticador.
				</p>
				<Link href="/app">← Voltar ao Growth OS</Link>
			</section>
		</main>
	);
}
