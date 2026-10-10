import type { IconName } from "@/components/ui/icons";
import type { ModuleCode } from "@/lib/product-view";
export const appNavigation: {
	href: string;
	label: string;
	icon: IconName;
	group: string;
	admin?: boolean;
	module?: ModuleCode;
}[] = [
	{
		href: "/app/today",
		label: "Hoje",
		icon: "calendar",
		group: "Operação",
		module: "crm",
	},
	{
		href: "/app",
		label: "Visão geral",
		icon: "dashboard",
		group: "Operação",
		module: "crm",
	},
	{
		href: "/app/results",
		label: "Resultados",
		module: "crm",
		icon: "reports",
		group: "Operação",
	},
	{
		href: "/app/inbox",
		label: "Inbox WhatsApp",
		module: "whatsapp",
		icon: "inbox",
		group: "Operação",
	},
	{
		href: "/app/contacts",
		label: "Contatos",
		module: "crm",
		icon: "contacts",
		group: "Operação",
	},
	{
		href: "/app/pipeline",
		label: "Pipeline",
		module: "crm",
		icon: "pipeline",
		group: "Operação",
	},
	{
		href: "/app/tasks",
		label: "Tarefas",
		icon: "tasks",
		group: "Operação",
		module: "crm",
	},
	{
		href: "/app/start",
		label: "Primeiros passos",
		module: "crm",
		icon: "target",
		group: "Workspace",
	},
	{
		href: "/app/settings/members",
		label: "Equipe",
		icon: "team",
		group: "Workspace",
	},
	{
		href: "/app/settings/integrations",
		label: "Integrações",
		icon: "integrations",
		group: "Workspace",
		admin: true,
	},
	{
		href: "/app/settings",
		label: "Configurações",
		icon: "settings",
		group: "Workspace",
		admin: true,
	},
	{
		href: "/app/settings/plan",
		label: "Plano e consumo",
		icon: "reports",
		group: "Workspace",
	},
];
export function visibleAppNavigation(
	admin: boolean,
	enabled: readonly ModuleCode[],
) {
	return appNavigation.filter(
		(item) =>
			(!item.admin || admin) && (!item.module || enabled.includes(item.module)),
	);
}
