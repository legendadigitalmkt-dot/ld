import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icons";
import {
	dateTime,
	money,
	priorityLabels,
	stageLabels,
	type Overview,
} from "@/lib/operational";
import styles from "./app.module.css";

function Metric({
	label,
	value,
	note,
	icon,
}: {
	label: string;
	value: string;
	note: string;
	icon: IconName;
}) {
	return (
		<article className={styles.metric}>
			<div className={styles.metricTop}>
				<Icon name={icon} />
				<span>{label}</span>
			</div>
			<strong>{value}</strong>
			<small>{note}</small>
		</article>
	);
}
function Empty({
	title,
	text,
	href,
	link,
}: {
	title: string;
	text: string;
	href?: string;
	link?: string;
}) {
	return (
		<div className={styles.empty}>
			<Icon name="target" />
			<strong>{title}</strong>
			<p>{text}</p>
			{href ? <Link href={href}>{link} →</Link> : null}
		</div>
	);
}
function RevenueChart({ values }: { values: Overview["revenue"] }) {
	const max = Math.max(...values.map((item) => item.value), 1);
	const points = values.map((item, index) => [
		40 + (index / Math.max(values.length - 1, 1)) * 650,
		175 - (item.value / max) * 155,
	]);
	const path = points
		.map(
			([x, y], index) => `${index ? "L" : "M"} ${x.toFixed(2)} ${y.toFixed(2)}`,
		)
		.join(" ");
	const dayLabel = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;
	return (
		<>
			<svg
				className={styles.chart}
				viewBox="0 0 710 200"
				role="img"
				aria-label="Valor dos negócios ganhos por dia. Consulte o total no título deste gráfico."
			>
				<title>Negócios ganhos por dia</title>
				<defs>
					<linearGradient id="os-revenue-gradient" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="#246bfd" stopOpacity=".25" />
						<stop offset="100%" stopColor="#246bfd" stopOpacity="0" />
					</linearGradient>
				</defs>
				{[20, 97.5, 175].map((y) => (
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
				<path
					d={`${path} L 690 175 L 40 175 Z`}
					fill="url(#os-revenue-gradient)"
				/>
				<path
					d={path}
					fill="none"
					stroke="#00d9ff"
					strokeWidth="2.5"
					strokeLinejoin="round"
				/>
			</svg>
			<div className={styles.chartDates}>
				<span>{dayLabel(values[0].day)}</span>
				<span>{dayLabel(values[Math.floor(values.length / 2)].day)}</span>
				<span>{dayLabel(values[values.length - 1].day)}</span>
			</div>
			<div className={styles.legend}>
				<i />
				Valor registrado nos negócios ganhos · não representa recebimento
				financeiro
			</div>
			<details className={styles.footerNote}>
				<summary>Consultar valores por dia</summary>
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
								<td>{money(item.value)}</td>
							</tr>
						))}
					</tbody>
				</table>
			</details>
		</>
	);
}

export function OverviewView({
	data,
	name,
	timezone,
	canEdit,
	workspaceError,
}: {
	data: Overview;
	name: string;
	timezone: string;
	canEdit: boolean;
	workspaceError?: boolean;
}) {
	const s = data.stats;
	const number = (value: number) =>
		new Intl.NumberFormat("pt-BR").format(value);
	const period = `Últimos ${data.days} dias`;
	const maxStage = Math.max(...data.stages.map((item) => item.count), 1);
	const maxSource = Math.max(...data.sources.map((item) => item.count), 1);
	const next = s.overdue
		? {
				title: `${number(s.overdue)} tarefas precisam ser retomadas.`,
				text: "Comece pelos prazos vencidos. Conclua o que já foi feito e retome o restante com a equipe.",
				href: "/app/tasks?status=overdue",
				link: "Revisar tarefas atrasadas",
			}
		: s.no_followup
			? {
					title: `${number(s.no_followup)} leads sem próxima tarefa.`,
					text: "Defina uma ação ligada ao contato para manter o acompanhamento visível na operação.",
					href: "/app/contacts?status=lead",
					link: "Organizar próximos passos",
				}
			: s.idle
				? {
						title: `${number(s.idle)} oportunidades sem atividade há 24h.`,
						text: "Confira o histórico antes de atualizar o negócio ou criar uma tarefa de acompanhamento.",
						href: "/app/pipeline",
						link: "Revisar pipeline",
					}
				: {
						title: "Sua próxima ação começa com contexto.",
						text: s.contacts
							? "Acompanhe as tarefas da equipe e mantenha o pipeline atualizado."
							: "Cadastre o primeiro lead para começar a organizar sua operação comercial.",
						href: s.contacts ? "/app/tasks" : "/app/contacts",
						link: s.contacts ? "Abrir tarefas" : "Abrir contatos",
					};
	const compact = [
		["Novos contatos", number(s.new_leads), period],
		["Oportunidades abertas", number(s.open_deals), "Situação atual"],
		["Em negociação", money(s.negotiation), "Etapa Negociação · atual"],
		[
			"Valor perdido",
			money(s.lost),
			`${s.lost_count} negócios · ${data.days} dias`,
		],
		["Ticket médio ganho", money(s.average_ticket), period],
		[
			"Forecast ponderado",
			money(s.forecast),
			"Pipeline × probabilidade · estimativa",
		],
		["Tarefas atrasadas", number(s.overdue), `${s.open_tasks} tarefas abertas`],
		[
			"Leads sem próxima tarefa",
			number(s.no_followup),
			"Lead sem tarefa aberta vinculada",
		],
	];
	return (
		<>
			{workspaceError ? (
				<p className={styles.notice} role="alert">
					Esse workspace não está disponível para sua conta. Mantivemos um
					workspace autorizado.
				</p>
			) : null}
			<div className={styles.pageHeader}>
				<div>
					<span className={styles.eyebrow}>VISÃO GERAL · {name}</span>
					<h1>Sua operação, em perspectiva.</h1>
					<p>Veja o que está avançando e escolha o próximo passo.</p>
				</div>
				<div className={styles.headerActions}>
					<nav aria-label="Período dos indicadores" className={styles.periods}>
						<Link
							href="/app?days=30"
							aria-current={data.days === 30 ? "page" : undefined}
						>
							30 dias
						</Link>
						<Link
							href="/app?days=90"
							aria-current={data.days === 90 ? "page" : undefined}
						>
							90 dias
						</Link>
					</nav>
					<Link href="/app/contacts#new-contact" className="button">
						<Icon name="contacts" />
						&nbsp;{canEdit ? "Novo lead" : "Ver contatos"}
					</Link>
				</div>
			</div>
			<section
				aria-label="Principais indicadores"
				className={styles.metricGrid}
			>
				<Metric
					label="Leads ativos"
					value={number(s.leads)}
					note={`${number(s.contacts)} contatos no workspace`}
					icon="contacts"
				/>
				<Metric
					label="Pipeline aberto"
					value={money(s.pipeline)}
					note="Valor das oportunidades ainda abertas"
					icon="pipeline"
				/>
				<Metric
					label="Valor ganho"
					value={money(s.won)}
					note={`${s.won_count} negócios ganhos · ${data.days} dias`}
					icon="reports"
				/>
				<Metric
					label="Conversão de fechamentos"
					value={
						s.conversion === null
							? "—"
							: `${s.conversion.toLocaleString("pt-BR")}%`
					}
					note="Ganhos ÷ (ganhos + perdidos) no período"
					icon="target"
				/>
			</section>
			<section
				aria-label="Indicadores complementares"
				className={styles.compactMetrics}
			>
				{compact.map(([label, value, note]) => (
					<article className={styles.compactMetric} key={label}>
						<span>{label}</span>
						<strong>{value}</strong>
						<small>{note}</small>
					</article>
				))}
			</section>
			<div className={styles.dashboardGrid}>
				<section className={styles.panel}>
					<div className={styles.panelHeader}>
						<div>
							<h2>Evolução do valor ganho</h2>
							<p>
								{period} · fuso {timezone}
							</p>
						</div>
						<strong>{money(s.won)}</strong>
					</div>
					{data.revenue.some((item) => item.value > 0) ? (
						<RevenueChart values={data.revenue} />
					) : (
						<Empty
							title="Seu primeiro resultado começa na operação."
							text="Os valores aparecerão aqui quando um negócio for marcado como ganho no período."
							href="/app/pipeline"
							link="Abrir pipeline"
						/>
					)}
				</section>
				<section className={styles.panel}>
					<div className={styles.panelHeader}>
						<div>
							<h2>Distribuição do pipeline</h2>
							<p>Negócios abertos por etapa · situação atual</p>
						</div>
						<Link href="/app/pipeline">Ver pipeline →</Link>
					</div>
					<div className={styles.breakdown}>
						{data.stages.map((item) => (
							<div key={item.stage} className={styles.breakdownRow}>
								<div>
									<span>{stageLabels[item.stage]}</span>
									<small>
										{item.count} · {money(item.value)}
									</small>
								</div>
								<div className={styles.barTrack}>
									<span
										className={styles.barFill}
										style={{ width: `${(item.count / maxStage) * 100}%` }}
									/>
								</div>
							</div>
						))}
					</div>
				</section>
			</div>
			<div className={styles.dashboardGrid}>
				<section className={`${styles.panel} ${styles.actionPanel}`}>
					<div className={styles.panelHeader}>
						<div>
							<h2>Próxima melhor ação</h2>
							<p>Prioridade definida pelos dados da operação</p>
						</div>
						<Icon name="ai" />
					</div>
					<div className={styles.nextAction}>
						<Icon name="target" />
						<div>
							<strong>{next.title}</strong>
							<p>{next.text}</p>
							<Link href={next.href}>{next.link} →</Link>
						</div>
					</div>
					{data.attention.length ? (
						<>
							<span className={styles.navGroup}>
								Oportunidades sem atividade há 24h+
							</span>
							<ul className={styles.actionList}>
								{data.attention.map((item) => (
									<li key={item.id}>
										<Link
											href={`/app/pipeline?deal=${item.id}#deal-${item.id}`}
										>
											<div>
												<strong>{item.title}</strong>
												<span>
													{money(item.value)} · última atividade{" "}
													{dateTime(item.last_activity_at, timezone)}
												</span>
											</div>
											<Icon name="arrow" />
										</Link>
										{canEdit ? (
											<Link
												href={`/app/tasks?deal=${item.id}`}
												className={styles.quietButton}
											>
												Definir próxima tarefa →
											</Link>
										) : null}
									</li>
								))}
							</ul>
						</>
					) : null}
					{data.followups.length && !data.attention.length ? (
						<>
							<span className={styles.navGroup}>Leads sem próxima tarefa</span>
							<ul className={styles.actionList}>
								{data.followups.map((item) => (
									<li key={item.id}>
										<Link
											href={
												canEdit
													? `/app/tasks?contact=${item.id}`
													: `/app/contacts?contact=${item.id}`
											}
										>
											<div>
												<strong>{item.name}</strong>
												<span>
													{canEdit
														? "Definir uma tarefa de acompanhamento"
														: "Abrir contato"}
												</span>
											</div>
											<Icon name="arrow" />
										</Link>
									</li>
								))}
							</ul>
						</>
					) : null}
				</section>
				<section className={styles.panel}>
					<div className={styles.panelHeader}>
						<div>
							<h2>Tarefas da operação</h2>
							<p>Prazos mais próximos · {s.open_tasks} abertas</p>
						</div>
						<Link href="/app/tasks">Ver tarefas →</Link>
					</div>
					{data.tasks.length ? (
						<ul className={styles.actionList}>
							{data.tasks.map((item) => (
								<li key={item.id}>
									<Link
										href={`/app/tasks?status=all&task=${item.id}#task-${item.id}`}
									>
										<div>
											<strong>{item.title}</strong>
											<span>
												{priorityLabels[item.priority]} ·{" "}
												{dateTime(item.due_at, timezone)}
											</span>
										</div>
										<Icon name="arrow" />
									</Link>
								</li>
							))}
						</ul>
					) : (
						<Empty
							title="Nenhuma tarefa aberta."
							text="Crie uma próxima ação com prazo para acompanhar contatos e oportunidades."
							href="/app/tasks"
							link="Abrir tarefas"
						/>
					)}
				</section>
			</div>
			<div className={styles.dashboardGrid}>
				<section className={styles.panel}>
					<div className={styles.panelHeader}>
						<div>
							<h2>Atividade recente</h2>
							<p>Últimos registros do workspace</p>
						</div>
					</div>
					{data.activities.length ? (
						<ol className={styles.timeline}>
							{data.activities.map((item) => (
								<li key={item.id}>
									<p>{item.text}</p>
									<time dateTime={item.created_at}>
										{dateTime(item.created_at, timezone)}
									</time>
								</li>
							))}
						</ol>
					) : (
						<Empty
							title="O histórico começa com a primeira ação."
							text="Cadastros, movimentações do pipeline e alterações de tarefas compõem o histórico da operação."
						/>
					)}
				</section>
				<section className={styles.panel}>
					<div className={styles.panelHeader}>
						<div>
							<h2>Origem dos contatos</h2>
							<p>Principais origens · {period.toLowerCase()}</p>
						</div>
					</div>
					{data.sources.length ? (
						<div className={styles.breakdown}>
							{data.sources.map((item) => (
								<div key={item.name} className={styles.breakdownRow}>
									<div>
										<span>{item.name}</span>
										<small>{item.count} contatos</small>
									</div>
									<div className={styles.barTrack}>
										<span
											className={styles.barFill}
											style={{ width: `${(item.count / maxSource) * 100}%` }}
										/>
									</div>
								</div>
							))}
						</div>
					) : (
						<Empty
							title="Nenhum contato novo neste período."
							text="Informe a origem ao cadastrar o lead para entender como os contatos chegam à operação."
						/>
					)}
				</section>
			</div>
			<p className={styles.footerNote}>
				Dados do workspace atual · atualizado em{" "}
				{dateTime(data.as_of, timezone)} ({timezone}). Indicadores do período e
				da situação atual estão identificados em cada card. A priorização usa
				regras; Growth AI continua em desenvolvimento.
			</p>
		</>
	);
}
