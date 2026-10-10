import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import {
	controlNavigation,
	controlRoleLabels,
	type PlatformContext,
} from "@/lib/control-view";
import { ControlNav } from "./control-nav";
import styles from "./control.module.css";
export function ControlShell({
	context,
	children,
}: {
	context: PlatformContext;
	children: React.ReactNode;
}) {
	const navigation = controlNavigation.filter((item) =>
		context.permissions.includes(item.permission),
	);
	return (
		<div className={styles.shell}>
			<a href="#control-main" className={styles.skip}>
				Pular para o conteúdo
			</a>
			<aside className={styles.sidebar}>
				<Link href="/control-center" className={styles.brand}>
					<Icon name="shield" />
					<div>
						<strong>{context.presentation?.display_name ?? "Growth OS"}</strong>
						<span>CONTROL CENTER</span>
					</div>
				</Link>
				<div className={styles.owner}>
					<span>PLATFORM OWNER WORKSPACE</span>
					<strong>{context.owner_workspace?.name}</strong>
					<small>
						{context.roles.map((role) => controlRoleLabels[role]).join(" · ")}
					</small>
				</div>
				<ControlNav navigation={navigation} />
				<div className={styles.sidebarFooter}>
					<span>
						<Icon name="lock" /> Sessão com MFA
					</span>
					<Link href="/app">
						Voltar ao Growth OS <Icon name="arrow" />
					</Link>
				</div>
			</aside>
			<section className={styles.mainArea}>
				<header className={styles.topbar}>
					<div>
						<span className={styles.adminBadge}>
							{context.roles.includes("platform_owner")
								? "PLATFORM OWNER"
								: context.roles.includes("super_admin")
									? "SUPER ADMIN"
									: "ADMINISTRADOR"}
						</span>
						<span>Administração da plataforma</span>
					</div>
					<Link href="/app">
						Abrir operação <Icon name="arrow" />
					</Link>
				</header>
				<details className={styles.mobileNav}>
					<summary>Navegação do Control Center</summary>
					<ControlNav navigation={navigation} />
				</details>
				<main id="control-main" className={styles.content}>
					{children}
				</main>
			</section>
		</div>
	);
}
