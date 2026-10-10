import { moduleCodes, moduleLabels } from "@/lib/product-view";
import { usageResources, usageLabels, type PlanDetail } from "@/lib/plans-view";
import styles from "./control.module.css";
export function PlanFields({ plan }: { plan?: PlanDetail | null }) {
	return (
		<>
			<input type="hidden" name="id" value={plan?.id || ""} />
			<input type="hidden" name="revision" value={plan?.revision || 0} />
			<label>
				Código do plano
				<input
					name="code"
					required
					pattern="[a-z][a-z0-9_-]{1,47}"
					minLength={2}
					maxLength={48}
					defaultValue={plan?.code}
					readOnly={Boolean(plan)}
					placeholder="starter"
				/>
			</label>
			<label>
				Nome
				<input
					name="name"
					required
					minLength={2}
					maxLength={80}
					defaultValue={plan?.name}
				/>
			</label>
			<label>
				Descrição
				<textarea
					name="description"
					maxLength={300}
					defaultValue={plan?.description || ""}
				/>
			</label>
			<label>
				Estado do catálogo
				<select name="status" defaultValue={plan?.status || "draft"}>
					<option value="draft">Rascunho</option>
					{plan?.latest_version ? <option value="active">Ativo</option> : null}
					<option value="archived" disabled={!plan}>
						Arquivado
					</option>
				</select>
			</label>
			<fieldset className={styles.planFields}>
				<legend>Módulos incluídos</legend>
				{moduleCodes.map((key) => (
					<label className={styles.confirmation} key={key}>
						<input
							name={key}
							type="checkbox"
							defaultChecked={plan ? plan.draft_config.features[key] : true}
						/>
						{moduleLabels[key]}
					</label>
				))}
				<p>
					Growth AI depende do CRM. A inclusão respeita as regras de
					disponibilidade e a configuração da integração.
				</p>
			</fieldset>
			<fieldset className={styles.planFields}>
				<legend>Limites de registros armazenados</legend>
				{usageResources.map((key) => (
					<label key={key}>
						{usageLabels[key]}
						<input
							type="number"
							name={key}
							min={0}
							max={10000000}
							step={1}
							defaultValue={plan?.draft_config.limits[key] ?? ""}
							placeholder="Sem teto configurado"
						/>
					</label>
				))}
				<p>
					Vazio mantém ausência de teto. Zero bloqueia novas criações. Registros
					existentes são preservados; tarefas concluídas e oportunidades
					encerradas continuam contando.
				</p>
			</fieldset>
		</>
	);
}
