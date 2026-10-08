// biome-ignore-all lint/a11y/noNoninteractiveTabindex: WAI-ARIA tabpanels without focusable children must be keyboard reachable.

"use client";

import { useState, type KeyboardEvent } from "react";
import {
	DashboardPreview,
	InboxPreview,
	PipelinePreview,
} from "./product-preview";
import { Icon } from "./icons";
import styles from "./landing.module.css";

const tabs = [
	{ name: "Dashboard", icon: "dashboard" },
	{ name: "Pipeline", icon: "pipeline" },
	{ name: "Inbox WhatsApp", icon: "inbox" },
] as const;

export function ProductDemo() {
	const [selected, setSelected] = useState(0);
	function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
		const next =
			event.key === "ArrowRight"
				? (index + 1) % tabs.length
				: event.key === "ArrowLeft"
					? (index + tabs.length - 1) % tabs.length
					: event.key === "Home"
						? 0
						: event.key === "End"
							? tabs.length - 1
							: null;
		if (next === null) return;
		event.preventDefault();
		setSelected(next);
		document.getElementById(`growth-demo-tab-${next}`)?.focus();
	}
	return (
		<div className={styles.demo}>
			<div
				role="tablist"
				aria-label="Demonstração do Growth OS"
				className={styles.demoTabs}
			>
				{tabs.map((t, i) => (
					<button
						key={t.name}
						type="button"
						role="tab"
						id={`growth-demo-tab-${i}`}
						aria-selected={i === selected}
						aria-controls="growth-demo-panel"
						tabIndex={i === selected ? 0 : -1}
						className={selected === i ? styles.demoTabActive : ""}
						onClick={() => setSelected(i)}
						onKeyDown={(e) => navigate(e, i)}
					>
						<Icon name={t.icon} />
						{t.name}
					</button>
				))}
			</div>
			<div
				role="tabpanel"
				id="growth-demo-panel"
				aria-labelledby={`growth-demo-tab-${selected}`}
				tabIndex={0}
				className={styles.demoPanel}
			>
				{selected === 0 ? (
					<DashboardPreview id="interactive-revenue" />
				) : selected === 1 ? (
					<PipelinePreview />
				) : (
					<InboxPreview />
				)}
			</div>
			<p className={styles.demoNotice}>
				<Icon name="lock" />
				Explore sem login. Empresas, valores e conversas são fictícios; as
				prévias não acessam dados de clientes.
			</p>
		</div>
	);
}
