import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icons";
import {
	dateTime,
	money,
	type Overview,
	priorityLabels,
	stageLabels,
} from "@/lib/operational";
import styles from "./app.module.css";
import {
	ContactSources,
	ExportResults,
	RefreshResults,
	RevenueChart,
} from "./dashboard-interactions";

function Metric({
	label,
	value,
	note,
	icon,
	href,
}: {
	label: string;
	value: string;
	note: string;
	icon: IconName;
	href: string;
}) {
	return (
		<article className={styles.metric}>
			<Link href={href} className={styles.metricLink}>
				<div className={styles.metricTop}>
					<Icon name={icon} />
					<span>{label}</span>
				</div>
				<strong>{value}</strong>
				<small>{note}</small>
				<span className={styles.metricArrow}>
					<Icon name="arrow" />
				</span>
			</Link>
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
					href: "/app/today",
					link: "Planejar próximos passos",
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
			{canEdit && (!data.stats.contacts || !data.stats.open_tasks) ? (
				<section className={styles.firstSteps}>
					<div>
						<strong>Seu primeiro acompanhamento, com direção.</strong>
						<p>
							Guie um contato até a oportunidade e a primeira tarefa com prazo.
						</p>
					</div>
					<Link href="/app/start">Concluir primeiros passos →</Link>
				</section>
			) : null}
			<div className={styles.pageHeader}>
				<div>
					<span className={styles.eyebrow}>VISÃO GERAL · {name}</span>
					<h1>Sua operação, em perspectiva.</h1>
					<p>Veja o que está avançando e escolha o próximo passo.</p>
				</div>
				<div className={styles.headerActions}>
					<Link
						href={`/app/results?days=${data.days}`}
						className="button secondary"
					>
						<Icon name="reports" />
						&nbsp;Analisar resultados
					</Link>
					<RefreshResults />
					<ExportResults data={data} />
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
					<Link href="/app/contacts?new=1#new-contact" className="button">
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
					href="/app/contacts?status=lead"
				/>
				<Metric
					label="Pipeline aberto"
					value={money(s.pipeline)}
					note="Valor das oportunidades ainda abertas"
					icon="pipeline"
					href="/app/pipeline"
				/>
				<Metric
					label="Valor ganho"
					value={money(s.won)}
					note={`${s.won_count} negócios ganhos · ${data.days} dias`}
					icon="reports"
					href="/app/pipeline?stage=won&view=table"
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
					href="/app/pipeline?stage=all&view=table"
				/>
			</section>
			<div className={styles.attentionStrip}>
				<Link href="/app/tasks?status=overdue">
					<Icon name="clock" />
					<strong>{s.overdue}</strong> tarefas atrasadas <Icon name="arrow" />
				</Link>
				<Link href="/app/pipeline?idle=1">
					<Icon name="pipeline" />
					<strong>{s.idle}</strong> oportunidades sem atividade há 24h+{" "}
					<Icon name="arrow" />
				</Link>
				<Link href="/app/inbox">
					<Icon name="inbox" />
					<strong>{s.unread}</strong> conversas não lidas <Icon name="arrow" />
				</Link>
			</div>
			<details className={styles.moreMetrics}>
				<summary>
					Mais indicadores da operação <Icon name="plus" />
				</summary>
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
			</details>
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
					{data.revenue.length ? (
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
							<Link
								href={`/app/pipeline?stage=${item.stage}`}
								key={item.stage}
								className={styles.breakdownRow}
							>
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
							</Link>
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
													: `/app/contacts/${item.id}`
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
									<p>
										{item.text.length > 220
											? `${item.text.slice(0, 220)}…`
											: item.text}
									</p>
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
						<ContactSources sources={data.sources} />
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
				{dateTime(data.as_of, timezone)} ({timezone}). O período e a situação
				atual estão identificados em cada indicador. O forecast é uma estimativa
				comercial.
			</p>
		</>
	);
}
