"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icons";
import { appNavigation } from "@/lib/app-navigation";
import styles from "./app.module.css";

export function AppNavigation({
	admin,
	close,
}: {
	admin: boolean;
	close?: () => void;
}) {
	const pathname = usePathname();
	return (
		<nav aria-label="Navegação do Growth OS" className={styles.navigation}>
			{["Operação", "Workspace"].map((group) => (
				<div key={group}>
					<span className={styles.navGroup}>{group}</span>
					{appNavigation
						.filter((item) => item.group === group && (!item.admin || admin))
						.map((item) => {
							const current =
								item.href === "/app" || item.href === "/app/settings"
									? pathname === item.href
									: pathname.startsWith(item.href);
							return (
								<Link
									key={item.href}
									href={item.href}
									onClick={close}
									aria-current={current ? "page" : undefined}
									className={current ? styles.navActive : undefined}
								>
									<Icon name={item.icon} />
									<span>{item.label}</span>
									{current ? <span className={styles.navDot} /> : null}
								</Link>
							);
						})}
				</div>
			))}
		</nav>
	);
}
