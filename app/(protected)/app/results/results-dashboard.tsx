"use client";

import Link from "next/link";
import { type CSSProperties, useState } from "react";
import {
	RefreshResults,
	RevenueChart,
} from "@/components/app/dashboard-interactions";
import { Icon, type IconName } from "@/components/ui/icons";
import {
	dateTime,
	money,
	priorityLabels,
	stageLabels,
} from "@/lib/operational";
import {
	closingResults,
	type ResultsData,
	resultsCSV,
	stageDistribution,
} from "@/lib/results-view";
import styles from "./results.module.css";

const colors: Record<string, string> = {
	new: "#7c9aff",
	contacted: "#00d9ff",
	qualified: "#50dec1",
	proposal: "#b699ff",
	negotiation: "#ff91d6",
};
const number = (value: number) => value.toLocaleString("pt-BR");
const percent = (value: number | null) =>
	value === null
		? "—"
		: `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const dayLabel = (day: string) =>
	`${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(0, 4)}`;

function Metric({
	label,
	value,
	note,
	href,
	icon,
	tone,
}: {
	label: string;
	value: string;
	note: string;
	href: string;
	icon: IconName;
	tone: string;
}) {
	return (
		<Link href={href} className={styles.metric} data-tone={tone}>
			<div className={styles.metricLabel}>
				<Icon name={icon} />
				<span>{label}</span>
				<Icon name="arrow" />
			</div>
			<strong>{value}</strong>
			<small>{note}</small>
		</Link>
	);
}

export function ResultsDashboard({
	data,
	name,
	timezone,
}: {
	data: ResultsData;
	name: string;
	timezone: string;
}) {
	const [stageMode, setStageMode] = useState<"count" | "value">("count");
	const [exported, setExported] = useState(false);
	const stats = data.stats;
	const closing = closingResults(stats);
	const stages = stageDistribution(data.stages, stageMode);
	const period = `Últimos ${data.days} dias`;
	const from = data.revenue[0]?.day;
	const to = data.revenue.at(-1)?.day;
	const wonShare = closing.total ? (100 * stats.won_count) / closing.total : 0;

	function exportCSV() {
		const url = URL.createObjectURL(
			new Blob([resultsCSV(data, name, timezone)], {
				type: "text/csv;charset=utf-8",
			}),
		);
		const link = document.createElement("a");
		link.href = url;
		link.download = `growth-os-resultados-${data.as_of.slice(0, 10)}-${data.days}dias.csv`;
		link.click();
		URL.revokeObjectURL(url);
		setExported(true);
	}

	return (
		<div className={styles.results}>
			<header className={styles.header}>
				<div>
					<span className={styles.eyebrow}>CRM · RESULTADOS</span>
					<h1>Seu crescimento, em números.</h1>
					<p>{name} · indicadores dos registros do CRM.</p>
				</div>
				<div className={styles.actions}>
					<RefreshResults />
					<button type="button" onClick={exportCSV}>
						<Icon name="download" />
						Exportar CSV
					</button>
				</div>
			</header>
			<div className={styles.periodBar}>
				<div>
					<strong>{period}</strong>
					<span>
						{from && to ? `${dayLabel(from)} → ${dayLabel(to)}` : period} ·{" "}
						{timezone}
					</span>
				</div>
				<nav aria-label="Período dos resultados">
					<Link
						href="/app/results?days=30"
						aria-current={data.days === 30 ? "page" : undefined}
					>
						30 dias
					</Link>
					<Link
						href="/app/results?days=90"
						aria-current={data.days === 90 ? "page" : undefined}
					>
						90 dias
					</Link>
				</nav>
			</div>
			<p className={styles.exportStatus} role="status">
				{exported
					? "CSV preparado com os indicadores e valores por dia deste período."
					: ""}
			</p>
			<section
				className={styles.metrics}
				aria-label="Indicadores de resultados"
			>
				<Metric
					label="Oportunidades abertas"
					value={number(stats.open_deals)}
					note={`${money(stats.pipeline, 2)} em valor · situação atual`}
					href="/app/pipeline"
					icon="pipeline"
					tone="cyan"
				/>
				<Metric
					label="Conversão de fechamentos"
					value={percent(closing.conversion)}
					note={`${number(closing.total)} encerradas · ${data.days} dias`}
					href="#closing-results"
					icon="target"
					tone="violet"
				/>
				<Metric
					label="Vendas ganhas"
					value={number(stats.won_count)}
					note={`${money(stats.won, 2)} em valor · ${data.days} dias`}
					href="#won-results"
					icon="reports"
					tone="green"
				/>
				<Metric
					label="Tarefas atrasadas"
					value={number(stats.overdue)}
					note={`${number(stats.open_tasks)} tarefas abertas · situação atual`}
					href="/app/tasks?status=overdue"
					icon="clock"
					tone={stats.overdue ? "pink" : "cyan"}
				/>
			</section>
			<div className={styles.mainGrid}>
				<section className={styles.panel} aria-labelledby="stage-title">
					<div className={styles.panelHeader}>
						<div>
							<span className={styles.eyebrow}>FUNIL ATUAL</span>
							<h2 id="stage-title">Oportunidades por etapa</h2>
							<p>Negócios que estão abertos em cada etapa.</p>
						</div>
						<Link href="/app/pipeline">
							Abrir funil <Icon name="arrow" />
						</Link>
					</div>
					<fieldset
						className={styles.toggle}
						aria-label="Medida das oportunidades por etapa"
					>
						<button
							type="button"
							aria-pressed={stageMode === "count"}
							onClick={() => setStageMode("count")}
						>
							Quantidade
						</button>
						<button
							type="button"
							aria-pressed={stageMode === "value"}
							onClick={() => setStageMode("value")}
						>
							Valor
						</button>
					</fieldset>
					<div className={styles.stages}>
						{stages.map((stage) => (
							<Link
								key={stage.stage}
								href={`/app/pipeline?stage=${stage.stage}`}
								className={styles.stage}
								style={
									{
										"--stage-color": colors[stage.stage] || "#7c9aff",
										"--stage-width": `${stage.width}%`,
									} as CSSProperties
								}
							>
								<div>
									<span>
										<i />
										{stageLabels[stage.stage] || stage.stage}
									</span>
									<strong>
										{stageMode === "count"
											? number(stage.count)
											: money(stage.value, 2)}
									</strong>
								</div>
								<div className={styles.track} aria-hidden="true">
									<i />
								</div>
								<small>
									{percent(stage.share)}{" "}
									{stageMode === "count"
										? "das oportunidades abertas"
										: "do valor do pipeline"}
									<Icon name="arrow" />
								</small>
							</Link>
						))}
					</div>
					{!stats.open_deals ? (
						<p className={styles.empty}>
							O funil está sem oportunidades abertas.{" "}
							<Link href="/app/contacts">Ver contatos →</Link>
						</p>
					) : stageMode === "value" && !stats.pipeline ? (
						<p className={styles.empty}>
							As oportunidades abertas ainda não têm valor informado.
						</p>
					) : null}
				</section>
				<section
					className={styles.panel}
					id="closing-results"
					aria-labelledby="closing-title"
				>
					<div className={styles.panelHeader}>
						<div>
							<span className={styles.eyebrow}>FECHAMENTOS NO PERÍODO</span>
							<h2 id="closing-title">Conversão de vendas</h2>
							<p>{period} · data do fechamento.</p>
						</div>
					</div>
					<div className={styles.conversion}>
						<div
							className={styles.donut}
							style={{
								background: closing.total
									? `conic-gradient(#50dec1 0% ${wonShare}%, #ff91a8 ${wonShare}% 100%)`
									: "#233451",
							}}
						>
							<div>
								<strong>{percent(closing.conversion)}</strong>
								<span>{number(closing.total)} encerradas</span>
							</div>
						</div>
						<dl className={styles.closures}>
							<div>
								<dt>
									<i data-tone="green" />
									Ganhas
								</dt>
								<dd>{number(stats.won_count)}</dd>
							</div>
							<div>
								<dt>
									<i data-tone="pink" />
									Perdidas
								</dt>
								<dd>{number(stats.lost_count)}</dd>
							</div>
						</dl>
					</div>
					<p className={styles.formula}>
						Conversão = ganhas ÷ (ganhas + perdidas).
					</p>
					{closing.total === 0 ? (
						<p className={styles.empty}>
							Nenhuma oportunidade encerrada neste período. A taxa aparecerá com
							o primeiro fechamento.
						</p>
					) : closing.total < 5 ? (
						<p className={styles.sample}>
							Base inicial: {number(closing.total)}{" "}
							{closing.total === 1 ? "fechamento" : "fechamentos"}. Acompanhe a
							taxa conforme novos negócios forem encerrados.
						</p>
					) : null}
					<div className={styles.financials}>
						<div>
							<span>Ticket médio ganho</span>
							<strong>{money(stats.average_ticket, 2)}</strong>
						</div>
						<div>
							<span>Valor perdido no período</span>
							<strong>{money(stats.lost, 2)}</strong>
						</div>
					</div>
				</section>
			</div>
			<section
				className={`${styles.panel} ${styles.revenue}`}
				id="won-results"
				aria-labelledby="won-title"
			>
				<div className={styles.panelHeader}>
					<div>
						<span className={styles.eyebrow}>RESULTADO COMERCIAL</span>
						<h2 id="won-title">Evolução das vendas ganhas</h2>
						<p>{period} · valores pela data de fechamento.</p>
					</div>
					<strong className={styles.revenueTotal}>{money(stats.won, 2)}</strong>
				</div>
				{!stats.won_count ? (
					<p className={styles.empty}>
						Nenhuma venda ganha neste período. Os valores aparecerão ao marcar
						uma oportunidade como ganha.
					</p>
				) : null}
				<RevenueChart values={data.revenue} precision={2} />
			</section>
			<section className={styles.panel} aria-labelledby="overdue-title">
				<div className={styles.panelHeader}>
					<div>
						<span className={styles.eyebrow}>EXECUÇÃO ATUAL</span>
						<h2 id="overdue-title">Tarefas que precisam de atenção</h2>
						<p>Prazos vencidos de tarefas que continuam abertas.</p>
					</div>
					<Link href="/app/tasks?status=overdue">
						Revisar tarefas <Icon name="arrow" />
					</Link>
				</div>
				{stats.overdue === 0 ? (
					<div className={styles.clear}>
						<Icon name="check" />
						<div>
							<strong>Nenhuma tarefa atrasada.</strong>
							<p>
								{stats.open_tasks
									? "Continue acompanhando os próximos prazos."
									: "Planeje a próxima tarefa de acompanhamento para manter a operação em movimento."}
							</p>
						</div>
						<Link href="/app/today">Planejar hoje →</Link>
					</div>
				) : (
					<>
						<ul className={styles.taskList}>
							{data.tasks.map((task) => (
								<li key={task.id}>
									<Link href={`/app/tasks?status=overdue&task=${task.id}`}>
										<div>
											<strong>{task.title}</strong>
											<span>
												{dateTime(task.due_at, timezone)} ·{" "}
												{priorityLabels[task.priority] || task.priority}
											</span>
										</div>
										<Icon name="arrow" />
									</Link>
								</li>
							))}
						</ul>
						<p className={styles.formula}>
							Exibindo {data.tasks.length} de {number(stats.overdue)} tarefas
							atrasadas.{" "}
							<Link href="/app/tasks?status=overdue">Ver todas →</Link>
						</p>
					</>
				)}
			</section>
			<details className={styles.definitions}>
				<summary>Como os indicadores são calculados</summary>
				<dl>
					<div>
						<dt>Oportunidades por etapa</dt>
						<dd>
							Quantidade e valor dos negócios atualmente abertos no workspace.
						</dd>
					</div>
					<div>
						<dt>Conversão</dt>
						<dd>
							Negócios ganhos divididos pelo total de ganhos e perdidos
							encerrados no período. Sem fechamentos, mostramos “—”.
						</dd>
					</div>
					<div>
						<dt>Vendas ganhas</dt>
						<dd>
							Quantidade e valor das oportunidades atualmente ganhas cuja data
							de fechamento está no período, no fuso {timezone}.
						</dd>
					</div>
					<div>
						<dt>Tarefas atrasadas</dt>
						<dd>
							Tarefas abertas com prazo anterior à atualização dos indicadores.
							Esse número mostra a situação atual.
						</dd>
					</div>
				</dl>
			</details>
			<p className={styles.updated}>
				Dados atualizados em {dateTime(data.as_of, timezone)} · {timezone}. Use
				Atualizar para consultar os registros novamente.
			</p>
		</div>
	);
}
