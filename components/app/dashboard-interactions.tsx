"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Icon } from "@/components/ui/icons";
import { money, type Overview } from "@/lib/operational";
import styles from "./app.module.css";

export function RefreshResults() {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	return (
		<button
			className={styles.refreshButton}
			type="button"
			disabled={pending}
			onClick={() => startTransition(() => router.refresh())}
		>
			<Icon name="refresh" />
			{pending ? "Atualizando..." : "Atualizar"}
		</button>
	);
}

export function ExportResults({ data }: { data: Overview }) {
	function download() {
		const rows = [
			["Indicador", "Valor", "Escopo"],
			["Leads ativos", String(data.stats.leads), "Atual"],
			["Oportunidades abertas", String(data.stats.open_deals), "Atual"],
			["Valor do pipeline", String(data.stats.pipeline), "Atual"],
			["Forecast ponderado", String(data.stats.forecast), "Estimativa atual"],
			["Valor ganho", String(data.stats.won), `Últimos ${data.days} dias`],
			[
				"Negócios ganhos",
				String(data.stats.won_count),
				`Últimos ${data.days} dias`,
			],
			["Valor perdido", String(data.stats.lost), `Últimos ${data.days} dias`],
			[
				"Conversão de fechamentos (%)",
				data.stats.conversion === null ? "" : String(data.stats.conversion),
				`Últimos ${data.days} dias`,
			],
			["Atualizado em", data.as_of, "UTC"],
			[],
			["Dia", "Valor ganho (BRL)"],
			...data.revenue.map((day) => [day.day, String(day.value)]),
		];
		const csv =
			"\uFEFF" +
			rows
				.map((row) =>
					row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(";"),
				)
				.join("\r\n");
		const url = URL.createObjectURL(
			new Blob([csv], { type: "text/csv;charset=utf-8" }),
		);
		const link = document.createElement("a");
		link.href = url;
		link.download = `growth-os-resultados-${data.as_of.slice(0, 10)}-${data.days}dias.csv`;
		link.click();
		URL.revokeObjectURL(url);
	}
	return (
		<button className={styles.refreshButton} type="button" onClick={download}>
			<Icon name="download" />
			Exportar CSV
		</button>
	);
}

export function RevenueChart({
	values,
	precision = 0,
}: {
	values: Overview["revenue"];
	precision?: 0 | 2;
}) {
	const id = useId();
	const [mode, setMode] = useState<"line" | "bars">("line");
	const [active, setActive] = useState(Math.max(0, values.length - 1));
	if (!values.length)
		return (
			<p className={styles.footerNote}>Nenhum valor registrado no período.</p>
		);
	const max = Math.max(...values.map((item) => item.value), 1);
	const step = 650 / Math.max(values.length - 1, 1);
	const points = values.map((item, index) => [
		40 + index * step,
		175 - (item.value / max) * 150,
	]);
	const path = points
		.map(([x, y], index) => `${index ? "L" : "M"} ${x} ${y}`)
		.join(" ");
	const selected = values[Math.min(active, values.length - 1)];
	const selectedPoint = points[Math.min(active, values.length - 1)];
	const valueLabel = (value: number) => money(value, precision);
	const dayLabel = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;
	return (
		<>
			<div className={styles.chartControls}>
				<fieldset
					className={styles.segmented}
					aria-label="Visualização do gráfico"
				>
					<button
						type="button"
						aria-pressed={mode === "line"}
						onClick={() => setMode("line")}
					>
						Linha
					</button>
					<button
						type="button"
						aria-pressed={mode === "bars"}
						onClick={() => setMode("bars")}
					>
						Barras
					</button>
				</fieldset>
				<div className={styles.chartReadout} aria-live="polite">
					<span>{dayLabel(selected.day)}</span>
					<strong>{valueLabel(selected.value)}</strong>
				</div>
			</div>
			<svg
				className={styles.chart}
				viewBox="0 0 710 200"
				role="img"
				aria-label="Valor dos negócios ganhos por dia. Use o seletor abaixo para consultar um dia."
				onPointerMove={(event) => {
					const rect = event.currentTarget.getBoundingClientRect();
					const x = ((event.clientX - rect.left) / rect.width) * 710;
					setActive(
						Math.max(
							0,
							Math.min(values.length - 1, Math.round((x - 40) / step)),
						),
					);
				}}
			>
				<title>Negócios ganhos por dia</title>
				<defs>
					<linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="#00d9ff" stopOpacity=".25" />
						<stop offset="100%" stopColor="#754cff" stopOpacity="0" />
					</linearGradient>
				</defs>
				{[25, 100, 175].map((y) => (
					<line
						key={y}
						x1="40"
						y1={y}
						x2="690"
						y2={y}
						className={styles.chartGrid}
					/>
				))}
				<text x="0" y="24" className={styles.chartLabel}>
					{new Intl.NumberFormat("pt-BR", { notation: "compact" }).format(max)}
				</text>
				<text x="0" y="178" className={styles.chartLabel}>
					0
				</text>
				{mode === "line" ? (
					<>
						<path d={`${path} L 690 175 L 40 175 Z`} fill={`url(#${id})`} />
						<path
							className={styles.chartStroke}
							d={path}
							fill="none"
							stroke="#00d9ff"
							strokeWidth="2.5"
							strokeLinejoin="round"
							pathLength="1"
						/>
					</>
				) : (
					values.map((item, index) => (
						<rect
							key={item.day}
							x={points[index][0] - Math.min(step * 0.65, 18) / 2}
							y={points[index][1]}
							width={Math.min(step * 0.65, 18)}
							height={Math.max(item.value ? 2 : 0, 175 - points[index][1])}
							rx="2"
							fill={index === active ? "#00d9ff" : "#6366f1"}
						/>
					))
				)}
				<line
					x1={selectedPoint[0]}
					y1="20"
					x2={selectedPoint[0]}
					y2="175"
					stroke="#7e93b4"
					strokeDasharray="3 5"
				/>
				<circle
					cx={selectedPoint[0]}
					cy={selectedPoint[1]}
					r="5"
					fill="#00d9ff"
					stroke="#071021"
					strokeWidth="3"
				/>
			</svg>
			<label className={styles.chartSlider}>
				Consultar dia
				<input
					type="range"
					min="0"
					max={values.length - 1}
					value={active}
					onChange={(event) => setActive(Number(event.target.value))}
					aria-valuetext={`${dayLabel(selected.day)}: ${valueLabel(selected.value)}`}
				/>
			</label>
			<div className={styles.chartDates}>
				<span>{dayLabel(values[0].day)}</span>
				<span>{dayLabel(values[values.length - 1].day)}</span>
			</div>
			<p className={styles.legend}>
				<i />
				Valor dos negócios ganhos · não representa recebimento financeiro
			</p>
			<details className={styles.dataDetails}>
				<summary>Consultar valores por dia</summary>
				<div className={styles.dataTable}>
					<table>
						<thead>
							<tr>
								<th>Dia</th>
								<th>Valor ganho</th>
							</tr>
						</thead>
						<tbody>
							{values.map((item) => (
								<tr key={item.day}>
									<td>{dayLabel(item.day)}</td>
									<td>{valueLabel(item.value)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</details>
		</>
	);
}

export function ContactSources({ sources }: { sources: Overview["sources"] }) {
	const total = sources.reduce((sum, source) => sum + source.count, 0);
	const colors = [
		"#00d9ff",
		"#754cff",
		"#ff91d6",
		"#ffba72",
		"#50dec1",
		"#7c9aff",
	];
	let offset = 0;
	const segments = sources.map((source, index) => {
		const start = offset;
		offset += (source.count / (total || 1)) * 100;
		return `${colors[index % colors.length]} ${start}% ${offset}%`;
	});
	return (
		<div className={styles.sourcesLayout}>
			<div
				className={styles.sourceDonut}
				style={{ background: `conic-gradient(${segments.join(",")})` }}
				role="img"
				aria-label={`${total} novos contatos distribuídos por origem`}
			>
				<div>
					<strong>{total}</strong>
					<span>novos contatos</span>
				</div>
			</div>
			<div className={styles.sourceLegend}>
				{sources.map((source, index) => (
					<Link
						key={source.name}
						href={`/app/contacts?source=${encodeURIComponent(source.name)}`}
					>
						<i style={{ background: colors[index % colors.length] }} />
						<span>{source.name}</span>
						<strong>{Math.round((source.count / (total || 1)) * 100)}%</strong>
						<small>{source.count}</small>
					</Link>
				))}
			</div>
		</div>
	);
}
