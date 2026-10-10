"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icons";
import styles from "./app.module.css";
import type { ModuleCode } from "@/lib/product-view";
const items: { href: string; label: string; icon: IconName }[] = [
	{ href: "/app/today", label: "Hoje", icon: "calendar" },
	{ href: "/app/contacts", label: "Contatos", icon: "contacts" },
	{ href: "/app/pipeline", label: "Funil", icon: "pipeline" },
	{ href: "/app/tasks", label: "Tarefas", icon: "tasks" },
];
export function MobileNavigation({
	enabledModules,
}: {
	enabledModules: ModuleCode[];
}) {
	const pathname = usePathname();
	if (!enabledModules.includes("crm")) return null;
	return (
		<nav
			className={styles.mobileBottom}
			aria-label="Atalhos da operação no celular"
		>
			{items.map((item) => (
				<Link
					key={item.href}
					href={item.href}
					aria-current={pathname.startsWith(item.href) ? "page" : undefined}
				>
					<Icon name={item.icon} />
					<span>{item.label}</span>
				</Link>
			))}
		</nav>
	);
}
