import Link from "next/link";
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
			<nav
				className={styles.permissionList}
				aria-label="Seções de configurações"
			>
				<Link href="#general">General</Link>
				<Link href="#product">Product</Link>
				<Link href="#security">Security</Link>
				<Link href="#integrations">Integrations</Link>
			</nav>
			<section id="general" className={styles.panel}>
				<h2>General</h2>
				<p>
					Identidade da plataforma, suporte e fuso dos registros
					administrativos.
				</p>
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
			<section id="product" className={styles.panel}>
				<h2>Product</h2>
				<p>
					O catálogo de módulos já disponível tem permissões próprias. Preços,
					assinaturas e checkout aguardam os próximos marcos aprovados.
				</p>
				{context.permissions.includes("product.read") ? (
					<Link href="/control-center/product">
						Consultar módulos e disponibilidade →
					</Link>
				) : (
					<p>
						Seu papel permite consultar apenas esta fundação de configurações.
					</p>
				)}
			</section>
			<section id="security" className={styles.panel}>
				<h2>Security</h2>
				<p>
					O Control Center exige sessão válida, MFA verificado e permissões
					atuais. Senhas, fatores de autenticação e chaves não são editados
					nesta tela.
				</p>
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
			<section id="integrations" className={styles.panel}>
				<h2>Integrations</h2>
				<p>
					Conexões pertencem a cada workspace. Credenciais ficam na
					infraestrutura; esta fundação permite consultar os estados já
					cadastrados e não configura novos provedores.
				</p>
				{context.permissions.includes("workspaces.read") ? (
					<Link href="/control-center/workspaces">
						Consultar inventário por workspace →
					</Link>
				) : (
					<p>O inventário requer permissão de leitura de workspaces.</p>
				)}
			</section>
		</>
	);
}
