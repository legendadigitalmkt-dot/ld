import { requirePlatformPermission } from "@/lib/control";
import {
	controlQuery,
	type ControlPage,
	type AdminAudit,
} from "@/lib/control-view";
import { createClient } from "@/lib/supabase/server";
import { ControlHeading, Pagination } from "@/components/control/ui";
import { ControlFilter } from "@/components/control/filter";
import { AuditList } from "@/components/control/audit-list";
import styles from "@/components/control/control.module.css";
export default async function AuditPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const context = await requirePlatformPermission("audit.read");
	const filter = controlQuery(await searchParams);
	const client = await createClient();
	const { data, error } = await client.rpc("platform_audit", {
		p_query: filter.query,
		p_page: filter.page,
	});
	if (error || !data) throw new Error("Não foi possível carregar a auditoria.");
	const result = data as unknown as ControlPage<AdminAudit>;
	return (
		<>
			<ControlHeading
				eyebrow="GOVERNANÇA"
				title="Audit Logs"
				description="Trilha imutável de acessos e alterações administrativas. As mudanças registram ator, motivo e valores anteriores e posteriores."
			/>
			<ControlFilter
				base="/control-center/audit"
				query={filter.query}
				placeholder="Ação ou ID da entidade"
			/>
			<section className={styles.panel}>
				<AuditList
					items={result.items}
					timezone={context.presentation?.timezone}
				/>
			</section>
			<Pagination
				base="/control-center/audit"
				query={filter.query}
				page={result.page}
				total={result.total}
				size={result.page_size}
			/>
		</>
	);
}
