import { requirePlatformPermission } from "@/lib/control";
import type { ControlSettings } from "@/lib/control-view";
import { createClient } from "@/lib/supabase/server";
import { ControlHeading, ControlTime } from "@/components/control/ui";
import { AdminActionForm } from "@/components/control/admin-action-form";
import { saveControlSettings } from "../actions";
import styles from "@/components/control/control.module.css";
export default async function SettingsPage() {
	const context = await requirePlatformPermission("settings.read");
	const client = await createClient();
	const { data, error } = await client.rpc("platform_settings");
	if (error || !data)
		throw new Error("Não foi possível carregar as configurações.");
	const settings = data as unknown as ControlSettings;
	return (
		<>
			<ControlHeading
				eyebrow="GOVERNANÇA"
				title="Settings"
				description="Configurações gerais da plataforma, com controle de versão e auditoria. Credenciais permanecem na infraestrutura."
			/>
			<section className={styles.panel}>
				<h2>Identidade e suporte</h2>
				{context.permissions.includes("system.settings") ? (
					<AdminActionForm
						key={settings.revision}
						action={saveControlSettings}
						label="Salvar configurações"
					>
						<input type="hidden" name="revision" value={settings.revision} />
						<label>
							Nome da plataforma
							<input
								name="display_name"
								required
								minLength={2}
								maxLength={80}
								defaultValue={settings.display_name}
							/>
						</label>
						<label>
							Fuso dos registros administrativos
							<input
								name="timezone"
								required
								maxLength={80}
								defaultValue={settings.timezone}
								list="control-timezones"
							/>
							<datalist id="control-timezones">
								<option value="America/Sao_Paulo" />
								<option value="America/Manaus" />
								<option value="America/Recife" />
								<option value="UTC" />
							</datalist>
						</label>
						<label>
							E-mail de suporte
							<input
								name="support_email"
								type="email"
								maxLength={254}
								defaultValue={settings.support_email ?? ""}
							/>
						</label>
					</AdminActionForm>
				) : (
					<dl className={styles.facts}>
						<div>
							<dt>Nome</dt>
							<dd>{settings.display_name}</dd>
						</div>
						<div>
							<dt>Fuso</dt>
							<dd>{settings.timezone}</dd>
						</div>
						<div>
							<dt>Suporte</dt>
							<dd>{settings.support_email || "Não definido"}</dd>
						</div>
					</dl>
				)}
				<p>
					Versão {settings.revision} · Última alteração:{" "}
					<ControlTime
						value={settings.updated_at}
						timezone={context.presentation?.timezone}
					/>
				</p>
			</section>
			<section className={styles.panel}>
				<h2>Ambientes separados</h2>
				<dl className={styles.facts}>
					<div>
						<dt>Portal institucional</dt>
						<dd>legendadigital.com.br · repositório e banco próprios</dd>
					</div>
					<div>
						<dt>Growth OS</dt>
						<dd>app.legendadigital.com.br · repositório ld</dd>
					</div>
					<div>
						<dt>Segurança do Control Center</dt>
						<dd>MFA obrigatório e permissões verificadas no banco</dd>
					</div>
				</dl>
			</section>
		</>
	);
}
