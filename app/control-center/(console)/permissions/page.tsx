import { requirePlatformPermission } from "@/lib/control";
import {
	controlRoleLabels,
	platformRoles,
	type ControlRoles,
} from "@/lib/control-view";
import { createClient } from "@/lib/supabase/server";
import { ControlHeading } from "@/components/control/ui";
import { AdminActionForm } from "@/components/control/admin-action-form";
import { setControlRole } from "../actions";
import styles from "@/components/control/control.module.css";
export default async function PermissionsPage() {
	const context = await requirePlatformPermission("roles.read");
	const client = await createClient();
	const { data, error } = await client.rpc("platform_roles");
	if (error || !data)
		throw new Error("Não foi possível carregar as permissões.");
	const result = data as unknown as ControlRoles;
	return (
		<>
			<ControlHeading
				eyebrow="GOVERNANÇA"
				title="Permissões"
				description="Papéis da plataforma são independentes dos papéis do CRM. Só o Platform Owner pode conceder ou revogar acesso administrativo."
			/>
			<div className={styles.notice}>
				<strong>Privilégio mínimo</strong>Os papéis de módulos futuros têm
				apenas acesso ao overview nesta fundação. A concessão exige uma conta
				confirmada e membro do workspace proprietário. O papel Platform Owner
				tem provisionamento exclusivo pela infraestrutura.
			</div>
			<section className={styles.panel}>
				<h2>Membros do workspace proprietário</h2>
				{result.members.map((member) => (
					<article className={styles.panel} key={member.id}>
						<strong>{member.email || member.id}</strong>
						<p>
							{member.roles
								.map((role) => controlRoleLabels[role])
								.join(" · ") || "Sem papel administrativo"}
						</p>
						{context.permissions.includes("roles.manage") &&
						member.id !== context.user_id ? (
							<details>
								<summary>Gerenciar concessão</summary>
								<AdminActionForm
									key={member.roles.join(",")}
									action={setControlRole}
									label="Aplicar permissão"
								>
									<input type="hidden" name="id" value={member.id} />
									<label>
										Papel
										<select name="role" required>
											{platformRoles
												.filter((role) => role !== "platform_owner")
												.map((role) => (
													<option key={role} value={role}>
														{controlRoleLabels[role]}
													</option>
												))}
										</select>
									</label>
									<label>
										Ação
										<select name="enabled">
											<option value="true">Conceder</option>
											<option value="false">Revogar</option>
										</select>
									</label>
								</AdminActionForm>
							</details>
						) : null}
					</article>
				))}
			</section>
			<h2>Catálogo de papéis</h2>
			<div className={styles.catalog}>
				{result.catalog.map((role) => (
					<article key={role.code}>
						<h3>{role.label}</h3>
						<p>{role.description}</p>
						<div className={styles.permissionList}>
							{role.permissions.map((permission) => (
								<code key={permission}>{permission}</code>
							))}
						</div>
					</article>
				))}
			</div>
		</>
	);
}
