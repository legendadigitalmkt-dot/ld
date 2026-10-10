import type { IconName } from "@/components/ui/icons";
export const appNavigation: {
	href: string;
	label: string;
	icon: IconName;
	group: string;
	admin?: boolean;
}[] = [
	{ href: "/app/today", label: "Hoje", icon: "calendar", group: "Operação" },
	{ href: "/app", label: "Visão geral", icon: "dashboard", group: "Operação" },
	{
		href: "/app/inbox",
		label: "Inbox WhatsApp",
		icon: "inbox",
		group: "Operação",
	},
	{
		href: "/app/contacts",
		label: "Contatos",
		icon: "contacts",
		group: "Operação",
	},
	{
		href: "/app/pipeline",
		label: "Pipeline",
		icon: "pipeline",
		group: "Operação",
	},
	{ href: "/app/tasks", label: "Tarefas", icon: "tasks", group: "Operação" },
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
];
