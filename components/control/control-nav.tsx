"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icons";
import type { controlNavigation } from "@/lib/control-view";
import styles from "./control.module.css";
export function ControlNav({
	navigation,
}: {
	navigation: ReadonlyArray<(typeof controlNavigation)[number]>;
}) {
	const pathname = usePathname();
	return (
		<nav className={styles.navigation} aria-label="Navegação do Control Center">
			{["Controle", "Plataforma", "Governança"].map((group) => (
				<div key={group}>
					<span>{group}</span>
					{navigation
						.filter((item) => item.group === group)
						.map((item) => (
							<Link
								key={item.href}
								href={item.href}
								aria-current={
									pathname === item.href ||
									(item.href !== "/control-center" &&
										pathname.startsWith(`${item.href}/`))
										? "page"
										: undefined
								}
							>
								<Icon name={item.icon} />
								{item.label}
							</Link>
						))}
				</div>
			))}
		</nav>
	);
}
