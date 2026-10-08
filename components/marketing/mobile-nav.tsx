"use client";

import { useState } from "react";
import { Icon } from "./icons";
import styles from "./landing.module.css";
import { navigation } from "@/lib/marketing";

export function MobileNav() {
	const [open, setOpen] = useState(false);
	return (
		<div className={styles.mobileNav}>
			<button
				type="button"
				className={styles.menuButton}
				aria-expanded={open}
				aria-controls="growth-mobile-navigation"
				aria-label={open ? "Fechar menu" : "Abrir menu"}
				onClick={() => setOpen(!open)}
			>
				<Icon name={open ? "close" : "menu"} />
			</button>
			{open && (
				<nav
					id="growth-mobile-navigation"
					aria-label="Menu móvel"
					className={styles.mobileLinks}
				>
					{navigation.map(([label, href]) => (
						<a key={href} href={href} onClick={() => setOpen(false)}>
							{label}
						</a>
					))}
					<a href="/login">Entrar no Growth OS</a>
				</nav>
			)}
		</div>
	);
}
