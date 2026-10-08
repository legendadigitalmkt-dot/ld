import { GrowthMark, Icon, type IconName } from "./icons";
import styles from "./landing.module.css";

const previewNav: [string, IconName][] = [
	["Visão geral", "dashboard"],
	["Inbox", "inbox"],
	["Contatos", "contacts"],
	["Pipeline", "pipeline"],
	["Tarefas", "tasks"],
	["Equipe", "team"],
	["Relatórios", "reports"],
	["Integrações", "integrations"],
];

export function PreviewFrame({
	children,
	active = "Visão geral",
	compact = false,
}: {
	children: React.ReactNode;
	active?: string;
	compact?: boolean;
}) {
	return (
		<div
			className={`${styles.previewFrame} ${compact ? styles.previewCompact : ""}`}
		>
			<div className={styles.previewTop}>
				<div className={styles.previewBrand}>
					<GrowthMark />
					<b>Growth OS</b>
				</div>
				<span className={styles.previewSearch}>
					<Icon name="search" />
					Buscar na operação...
				</span>
				<span className={styles.previewPerson}>
					<Icon name="bell" />
					<span className={styles.avatar}>LD</span>
				</span>
			</div>
			<div className={styles.previewLayout}>
				<aside className={styles.previewSidebar}>
					{previewNav.map(([title, icon]) => (
						<span
							key={title}
							className={active === title ? styles.previewActive : ""}
						>
							<Icon name={icon} />
							{title}
						</span>
					))}
					<span className={styles.previewWorkspace}>
						<i />
						Workspace exemplo
					</span>
				</aside>
				<div className={styles.previewContent}>{children}</div>
			</div>
			<div className={styles.previewDisclaimer}>
				<i />
				Dados demonstrativos · Interface ilustrativa do produto
			</div>
		</div>
	);
}

export function RevenueChart({ id = "growth-revenue" }: { id?: string }) {
	return (
		<svg
			className={styles.revenueChart}
			viewBox="0 0 420 165"
			role="img"
			aria-label="Gráfico ilustrativo de receita crescente. Dados demonstrativos."
		>
			<defs>
				<linearGradient id={`${id}-line`} x1="0" x2="1">
					<stop stopColor="#754CFF" />
					<stop offset=".55" stopColor="#00D9FF" />
					<stop offset="1" stopColor="#19DFC5" />
				</linearGradient>
				<linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
					<stop stopColor="#246BFD" stopOpacity=".35" />
					<stop offset="1" stopColor="#246BFD" stopOpacity="0" />
				</linearGradient>
			</defs>
			{[28, 63, 98, 133].map((y) => (
				<path
					key={y}
					d={`M35 ${y}h370`}
					stroke="#16304d"
					strokeDasharray="3 5"
				/>
			))}
			<g fill="#7e96b8" fontSize="9">
				<text x="4" y="30">
					300k
				</text>
				<text x="4" y="65">
					200k
				</text>
				<text x="4" y="100">
					100k
				</text>
				<text x="24" y="135">
					0
				</text>
			</g>
			<path
				d="M35 126C55 126 56 108 74 111S96 135 115 96 136 126 158 86 181 95 197 81 217 90 237 60 254 88 275 57 295 72 315 37 339 62 356 24 380 36 405 15V140H35Z"
				fill={`url(#${id}-fill)`}
			/>
			<path
				d="M35 126C55 126 56 108 74 111S96 135 115 96 136 126 158 86 181 95 197 81 217 90 237 60 254 88 275 57 295 72 315 37 339 62 356 24 380 36 405 15"
				fill="none"
				stroke={`url(#${id}-line)`}
				strokeWidth="3"
			/>
			<circle cx="405" cy="15" r="4" fill="#19DFC5" />
			<g fill="#8FA1BA" fontSize="9">
				{["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul"].map((m, i) => (
					<text key={m} x={35 + i * 59} y="159">
						{m}
					</text>
				))}
			</g>
		</svg>
	);
}

export function DashboardPreview({
	compact = false,
	id = "dashboard",
}: {
	compact?: boolean;
	id?: string;
}) {
	return (
		<PreviewFrame compact={compact}>
			<div className={styles.previewHeading}>
				<div>
					<span>VISÃO GERAL</span>
					<h3>Sua operação, em perspectiva.</h3>
				</div>
				<span className={styles.previewFilter}>Últimos 30 dias⌄</span>
			</div>
			<div className={styles.previewMetrics}>
				{[
					["Receita ganha", "R$ 128.900", "+24%", "reports"],
					["Leads ativos", "1.248", "+12%", "contacts"],
					["Oportunidades", "320", "+8%", "pipeline"],
					["Conversão", "18,4%", "+3,2%", "target"],
				].map(([label, value, trend, icon]) => (
					<div key={label}>
						<span>
							<Icon name={icon as IconName} />
							{label}
						</span>
						<b>{value}</b>
						<small>↗ {trend}</small>
					</div>
				))}
			</div>
			<div className={styles.previewCharts}>
				<section className={styles.previewPanel}>
					<div className={styles.previewPanelHeading}>
						<b>Evolução de receita</b>
						<span className={styles.green}>+24%</span>
					</div>
					<RevenueChart id={id} />
				</section>
				<section className={styles.previewPanel}>
					<b>Origem dos leads</b>
					<div className={styles.donutRow}>
						<div className={styles.donut}>
							<span>
								<b>1.248</b>
								<small>leads</small>
							</span>
						</div>
						<div className={styles.legend}>
							{[
								["WhatsApp", "42%", "#19dfc5"],
								["Site", "24%", "#246bfd"],
								["Indicação", "18%", "#754cff"],
								["Outros", "16%", "#f02dce"],
							].map(([s, n, c]) => (
								<span key={s}>
									<i style={{ background: c }} />
									{s}
									<b>{n}</b>
								</span>
							))}
						</div>
					</div>
				</section>
			</div>
			<div className={styles.previewBottom}>
				<section className={styles.previewPanel}>
					<b>Leads que precisam de atenção</b>
					<p>
						<i className={styles.dotOrange} />
						12 leads sem próxima ação
					</p>
					<p>
						<i className={styles.dotPink} />4 tarefas aguardando retorno
					</p>
				</section>
				<section className={`${styles.previewPanel} ${styles.nextAction}`}>
					<Icon name="ai" />
					<div>
						<b>O próximo passo importa.</b>
						<p>Revisar a proposta da Clínica Horizonte.</p>
						<small>Exemplo de priorização comercial</small>
					</div>
				</section>
			</div>
		</PreviewFrame>
	);
}

const stages = [
	{
		title: "Novo lead",
		total: "R$ 28.240",
		color: "#754cff",
		deals: [
			["Clínica Horizonte", "R$ 3.000", "JM", "WhatsApp"],
			["Estúdio Aurora", "R$ 1.900", "AC", "Site"],
		],
	},
	{
		title: "Em contato",
		total: "R$ 48.400",
		color: "#00d9ff",
		deals: [
			["Loja Estação", "R$ 4.000", "BL", "Site"],
			["Consultoria Norte", "R$ 5.100", "JM", "Indicação"],
		],
	},
	{
		title: "Proposta",
		total: "R$ 62.500",
		color: "#f02dce",
		deals: [
			["Agência Orbit", "R$ 15.600", "AC", "WhatsApp"],
			["Escritório Prisma", "R$ 3.200", "BL", "Site"],
		],
	},
] as const;

export function PipelinePreview({ framed = true }: { framed?: boolean }) {
	const content = (
		<>
			<div className={styles.previewHeading}>
				<div>
					<span>NEGÓCIOS</span>
					<h3>Cada oportunidade tem um próximo passo.</h3>
				</div>
				<span className={styles.previewFilter}>Kanban</span>
			</div>
			<div className={styles.previewKanban}>
				{stages.map((s) => (
					<section key={s.title} style={{ borderTopColor: s.color }}>
						<header>
							<b>{s.title}</b>
							<Icon name="more" />
						</header>
						<span className={styles.kanbanTotal}>
							{s.total} <small>· exemplo</small>
						</span>
						{s.deals.map(([company, value, initials, source], i) => (
							<div className={styles.previewDeal} key={company}>
								<b>{company}</b>
								<strong>{value}</strong>
								<p>
									<span className={styles.avatar}>{initials}</span>Responsável
									da equipe
								</p>
								<span className={styles.sourcePill}>{source}</span>
								<footer>
									<Icon name="clock" />
									{i === 0 ? "Retornar hoje, 14h" : "Qualificar amanhã"}
								</footer>
							</div>
						))}
					</section>
				))}
			</div>
			<p className={styles.previewFootnote}>
				Novo lead → Contato → Qualificado → Proposta → Negociação → Ganho /
				Perdido
			</p>
		</>
	);
	return framed ? (
		<PreviewFrame active="Pipeline">{content}</PreviewFrame>
	) : (
		content
	);
}

export function InboxPreview({ framed = true }: { framed?: boolean }) {
	const content = (
		<>
			<div className={styles.previewHeading}>
				<div>
					<span>CONVERSAS</span>
					<h3>Atendimento com contexto.</h3>
				</div>
				<span className={styles.channelPill}>
					<Icon name="inbox" />
					WhatsApp
				</span>
			</div>
			<div className={styles.previewInbox}>
				<div className={styles.threadList}>
					{[
						[
							"JM",
							"João · Clínica Horizonte",
							"Podemos conversar sobre a proposta?",
							"10:24",
						],
						["AC", "Ana · Estúdio Aurora", "Obrigada pelo retorno!", "09:41"],
						["BL", "Bruno · Loja Estação", "Recebi o material.", "Ontem"],
					].map(([ini, name, msg, time], i) => (
						<div key={name} className={i === 0 ? styles.threadSelected : ""}>
							<span className={styles.avatar}>{ini}</span>
							<div>
								<b>{name}</b>
								<p>{msg}</p>
							</div>
							<small>{time}</small>
						</div>
					))}
				</div>
				<div className={styles.chat}>
					<div className={styles.chatHeader}>
						<span className={styles.avatar}>JM</span>
						<div>
							<b>João Martins</b>
							<small>Clínica Horizonte · conversa ilustrativa</small>
						</div>
					</div>
					<span className={styles.chatDay}>Hoje</span>
					<p className={styles.chatIncoming}>
						Olá! Podemos conversar sobre a proposta?<small>10:24</small>
					</p>
					<p className={styles.chatOutgoing}>
						Claro, João. Já tenho o contexto da sua operação. Vamos revisar o
						próximo passo juntos?<small>10:25 ✓✓</small>
					</p>
					<div className={styles.contactContext}>
						<span>Oportunidade vinculada</span>
						<b>Projeto comercial · R$ 3.000</b>
						<small>Próxima ação: revisar proposta</small>
					</div>
					<div className={styles.previewComposer}>
						<span>Demonstração — nenhuma mensagem será enviada</span>
						<Icon name="send" />
					</div>
				</div>
			</div>
		</>
	);
	return framed ? (
		<PreviewFrame active="Inbox">{content}</PreviewFrame>
	) : (
		content
	);
}
