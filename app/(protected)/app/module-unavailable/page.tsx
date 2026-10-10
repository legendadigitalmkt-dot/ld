import Link from "next/link";
import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/workspace";
import { getWorkspaceModules } from "@/lib/product";
import {
	moduleCode,
	moduleLabels,
	moduleSourceLabels,
} from "@/lib/product-view";
import { getPlatformContext } from "@/lib/control";

export default async function ModuleUnavailable({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const workspace = await requireWorkspace();
	const query = await searchParams;
	let code: ReturnType<typeof moduleCode> = "crm";
	try {
		code = moduleCode(query.module);
	} catch {
		/* Default to the operational module. */
	}
	const modules = await getWorkspaceModules(workspace.id);
	if (modules[code].enabled)
		redirect(code === "whatsapp" ? "/app/inbox" : "/app");
	const control = await getPlatformContext();
	return (
		<section className="panel">
			<p className="eyebrow">
				{workspace.name} · {moduleLabels[code]}
			</p>
			<h1>
				{modules[code].source === "plan"
					? "Este módulo não está incluído no plano"
					: "Este módulo está pausado"}
			</h1>
			<p>
				{moduleSourceLabels[modules[code].source]}. Seus dados permanecem
				preservados.
			</p>
			<p>
				Consulte o administrador da plataforma para conferir a disponibilidade
				deste módulo.
			</p>
			<div className="button-row">
				<Link className="button secondary" href="/app/settings/plan">
					Ver plano e consumo
				</Link>
				<Link className="button secondary" href="/app/settings/members">
					Ver equipe
				</Link>
				{control.permissions.includes("product.read") ? (
					<Link
						className="button"
						href={`/control-center/product?workspace=${workspace.id}`}
					>
						Gerenciar módulos
					</Link>
				) : null}
			</div>
		</section>
	);
}
