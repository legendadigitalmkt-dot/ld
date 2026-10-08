import Link from "next/link";
import { marketing, navigation, questions } from "@/lib/marketing";
import { GrowthMark, Icon, type IconName } from "./icons";
import { MobileNav } from "./mobile-nav";
import { ProductDemo } from "./product-demo";
import {
	DashboardPreview,
	InboxPreview,
	PipelinePreview,
} from "./product-preview";
import styles from "./landing.module.css";

function Brand() {
	return (
		<a
			href="/"
			className={styles.brand}
			aria-label="Growth OS by Legenda Digital — início"
		>
			<GrowthMark />
			<span>
				<b>Growth OS</b>
				<small>by Legenda Digital</small>
			</span>
		</a>
	);
}
function Action({
	children,
	href = marketing.login,
	secondary = false,
}: {
	children: React.ReactNode;
	href?: string;
	secondary?: boolean;
}) {
	return (
		<a
			className={`${styles.button} ${secondary ? styles.buttonSecondary : ""}`}
			href={href}
		>
			{children}
			<Icon name="arrow" />
		</a>
	);
}
function Eyebrow({ children }: { children: React.ReactNode }) {
	return <span className={styles.eyebrow}>{children}</span>;
}
function List({ items }: { items: readonly string[] }) {
	return (
		<ul className={styles.checkList}>
			{items.map((item) => (
				<li key={item}>
					<Icon name="check" />
					{item}
				</li>
			))}
		</ul>
	);
}

const modules: {
	title: string;
	icon: IconName;
	color: string;
	description: string;
	status: string;
	detail: string;
}[] = [
	{
		title: "Dashboard",
		icon: "dashboard",
		color: "blue",
		description: "Sua operação em uma visão clara.",
		status: "Base implementada",
		detail: "Contatos · Pipeline · Receita",
	},
	{
		title: "CRM",
		icon: "contacts",
		color: "cyan",
		description: "O contexto de cada relacionamento.",
		status: "Base implementada",
		detail: "Contatos · Empresas · Histórico",
	},
	{
		title: "Inbox WhatsApp",
		icon: "inbox",
		color: "green",
		description: "Converse com contexto comercial.",
		status: "Integração em validação",
		detail: "Cloud API · Conversas · Status",
	},
	{
		title: "Pipeline",
		icon: "pipeline",
		color: "violet",
		description: "Encontre o próximo passo de cada negócio.",
		status: "Base implementada",
		detail: "Kanban · Valores · Ganho / perdido",
	},
	{
		title: "Tarefas",
		icon: "tasks",
		color: "orange",
		description: "Transforme intenção em execução.",
		status: "Base implementada",
		detail: "Prioridade · Prazo · Responsável",
	},
	{
		title: "Equipe",
		icon: "team",
		color: "blue",
		description: "Pessoas alinhadas à mesma operação.",
		status: "Base implementada",
		detail: "Workspace · Membros · Permissões",
	},
	{
		title: "Automações",
		icon: "automation",
		color: "pink",
		description: "Uma rotina que evolui com o seu time.",
		status: "Em desenvolvimento",
		detail: "Gatilho → Condição → Ação",
	},
	{
		title: "Relatórios",
		icon: "reports",
		color: "violet",
		description: "Clareza para decidir e ajustar a rota.",
		status: "Em desenvolvimento",
		detail: "Conversão · Forecast · Performance",
	},
	{
		title: "Integrações",
		icon: "integrations",
		color: "cyan",
		description: "Conecte o que faz parte da sua rotina.",
		status: "WhatsApp como prioridade",
		detail: "Conexões · Diagnóstico · Webhooks",
	},
	{
		title: "Growth AI",
		icon: "ai",
		color: "pink",
		description: "Inteligência para orientar a próxima ação.",
		status: "No roadmap",
		detail: "Resumo · Sugestão · Priorização",
	},
];

const wavePaths = Array.from(
	{ length: 14 },
	(_, i) =>
		`M-80 ${610 + i * 5}C220 ${340 + i * 13} 370 ${910 - i * 8} 690 ${500 + i * 3}S1150 ${450 - i * 20} 1510 ${20 + i * 9}`,
);

export function GrowthLanding() {
	const structuredData = {
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		name: "Growth OS",
		applicationCategory: "BusinessApplication",
		operatingSystem: "Web",
		url: marketing.url,
		description: marketing.description,
		publisher: {
			"@type": "Organization",
			name: "Legenda Digital",
			url: "https://legendadigital.com.br",
		},
	};
	return (
		<div className={styles.landing}>
			<a className={styles.skipLink} href="#conteudo-principal">
				Pular para o conteúdo
			</a>
			<header className={styles.header}>
				<div className={styles.headerInner}>
					<Brand />
					<nav className={styles.desktopNav} aria-label="Menu principal">
						{navigation.map(([label, href]) => (
							<a key={href} href={href}>
								{label}
							</a>
						))}
					</nav>
					<div className={styles.headerActions}>
						<Link className={styles.loginLink} href={marketing.login}>
							Entrar
						</Link>
						<Action>Começar agora</Action>
					</div>
					<MobileNav />
				</div>
			</header>
			<main id="conteudo-principal">
				<section className={styles.hero} id="produto">
					<div className={styles.heroGlow} aria-hidden="true" />
					<svg
						className={styles.heroWaves}
						viewBox="0 0 1440 760"
						preserveAspectRatio="none"
						aria-hidden="true"
					>
						<defs>
							<linearGradient id="growth-wave">
								<stop stopColor="#754cff" />
								<stop offset=".6" stopColor="#246bfd" />
								<stop offset="1" stopColor="#00d9ff" />
							</linearGradient>
						</defs>
						{wavePaths.map((d) => (
							<path
								key={d}
								d={d}
								fill="none"
								stroke="url(#growth-wave)"
								opacity=".15"
								strokeWidth="1"
							/>
						))}
					</svg>
					<div className={`${styles.container} ${styles.heroGrid}`}>
						<div className={styles.heroCopy}>
							<span className={styles.heroBadge}>
								<i />
								Uma nova perspectiva para sua operação comercial
							</span>
							<h1>
								<span className={styles.productName}>Growth OS</span>O sistema
								operacional <em>de crescimento</em> da sua operação comercial.
							</h1>
							<p>
								CRM, WhatsApp, pipeline, tarefas e inteligência comercial.
								Conecte o contexto. Organize o próximo passo. Faça sua equipe
								avançar.
							</p>
							<div className={styles.heroActions}>
								<Action>Começar agora</Action>
								<a
									href="#demonstracao"
									className={`${styles.button} ${styles.buttonSecondary}`}
								>
									<Icon name="play" />
									Ver demonstração
								</a>
							</div>
							<div className={styles.heroAssurances}>
								<span>
									<Icon name="shield" />
									Acesso por workspace
								</span>
								<span>
									<Icon name="target" />
									Foco em execução
								</span>
								<span>
									<Icon name="team" />
									Construído para equipes
								</span>
							</div>
						</div>
						<div className={styles.heroVisual}>
							<div className={styles.laptop}>
								<div className={styles.laptopCamera} />
								<DashboardPreview compact id="hero-revenue" />
								<div className={styles.laptopBase} />
							</div>
							<div className={`${styles.floatingCard} ${styles.floatingTop}`}>
								<span className={`${styles.iconTile} ${styles.green}`}>
									<Icon name="inbox" />
								</span>
								<div>
									<b>Conversa com contexto</b>
									<small>Contato e oportunidade conectados</small>
								</div>
								<i />
							</div>
							<div
								className={`${styles.floatingCard} ${styles.floatingBottom}`}
							>
								<span className={`${styles.iconTile} ${styles.violet}`}>
									<Icon name="tasks" />
								</span>
								<div>
									<b>Seu próximo passo, visível.</b>
									<small>Uma operação orientada à ação</small>
								</div>
							</div>
							<div className={styles.heroDemoLabel}>
								PRÉVIA DO PRODUTO · DADOS DEMONSTRATIVOS
							</div>
						</div>
					</div>
				</section>
				<div className={styles.moduleStrip}>
					<div className={styles.container}>
						{[
							["CRM", "contacts", "Relacionamentos com contexto"],
							["WhatsApp", "inbox", "Conversas conectadas"],
							["Pipeline", "pipeline", "Visibilidade do funil"],
							["Tarefas", "tasks", "Próxima ação definida"],
							["Dados", "reports", "Decisões com clareza"],
							["Equipe", "team", "Uma operação alinhada"],
						].map(([name, icon, text]) => (
							<div key={name}>
								<Icon name={icon as IconName} />
								<span>
									<b>{name}</b>
									<small>{text}</small>
								</span>
							</div>
						))}
					</div>
				</div>

				<section
					className={`${styles.section} ${styles.problem}`}
					id="solucoes"
				>
					<div className={`${styles.container} ${styles.problemGrid}`}>
						<div>
							<Eyebrow>DO CAOS AO CONTROLE</Eyebrow>
							<h2>
								Seu crescimento não deveria depender <em>da sua memória.</em>
							</h2>
							<p>
								Leads em uma planilha. Conversas no celular. Próximos passos na
								cabeça. Quando tudo está separado, cada venda exige um esforço
								desnecessário.
							</p>
							<a className={styles.textLink} href="#demonstracao">
								Conheça outra forma de operar <Icon name="arrow" />
							</a>
						</div>
						<div className={styles.comparison}>
							<div className={styles.before}>
								<span className={styles.compareTitle}>
									<Icon name="close" />
									Uma operação fragmentada
								</span>
								<ul>
									{[
										"Leads esquecidos no WhatsApp",
										"Follow-up sem rotina definida",
										"Equipe sem visibilidade do funil",
										"Oportunidades sem próxima ação",
										"Decisões por intuição",
									].map((t) => (
										<li key={t}>
											<Icon name="close" />
											{t}
										</li>
									))}
								</ul>
							</div>
							<div className={styles.compareConnector}>
								<Icon name="arrow" />
							</div>
							<div className={styles.after}>
								<span className={styles.compareTitle}>
									<Icon name="check" />
									Uma operação conectada
								</span>
								<ul>
									{[
										"Relacionamentos em um só lugar",
										"Tarefas ligadas à operação",
										"Pipeline com etapas e responsáveis",
										"Histórico para retomar a conversa",
										"Visão clara do que precisa avançar",
									].map((t) => (
										<li key={t}>
											<Icon name="check" />
											{t}
										</li>
									))}
								</ul>
							</div>
						</div>
					</div>
				</section>

				<section className={`${styles.section} ${styles.flowSection}`}>
					<div className={styles.container}>
						<div className={styles.centerHeading}>
							<Eyebrow>UM SISTEMA. UMA OPERAÇÃO.</Eyebrow>
							<h2>
								Do primeiro contato <em>ao próximo crescimento.</em>
							</h2>
							<p>
								Conecte o ciclo comercial e mantenha o contexto ao longo do
								caminho.
							</p>
						</div>
						<ol className={styles.operationFlow}>
							{[
								["01", "Lead", "contacts"],
								["02", "Conversa", "inbox"],
								["03", "Oportunidade", "pipeline"],
								["04", "Próxima ação", "tasks"],
								["05", "Venda", "target"],
								["06", "Aprendizado", "reports"],
							].map(([n, t, icon]) => (
								<li key={n}>
									<span>{n}</span>
									<Icon name={icon as IconName} />
									<b>{t}</b>
								</li>
							))}
						</ol>
					</div>
				</section>

				<section className={styles.section} id="recursos">
					<div className={styles.container}>
						<div className={styles.sectionHeading}>
							<div>
								<Eyebrow>TUDO CONVERSA COM O SEU CRESCIMENTO</Eyebrow>
								<h2>
									Uma plataforma para todo <em>o ciclo comercial.</em>
								</h2>
							</div>
							<p>
								A base já conecta a operação. As próximas camadas ampliam
								inteligência e execução. Veja o estágio de cada módulo.
							</p>
						</div>
						<div className={styles.moduleGrid}>
							{modules.map((m) => (
								<article key={m.title} className={styles.moduleCard}>
									<div className={`${styles.iconTile} ${styles[m.color]}`}>
										<Icon name={m.icon} />
									</div>
									<h3>{m.title}</h3>
									<p>{m.description}</p>
									<span className={styles.moduleDetail}>{m.detail}</span>
									<span className={styles.moduleStatus}>
										<i />
										{m.status}
									</span>
								</article>
							))}
						</div>
					</div>
				</section>

				<section
					className={`${styles.section} ${styles.demoSection}`}
					id="demonstracao"
				>
					<div className={styles.container}>
						<div className={styles.centerHeading}>
							<Eyebrow>POR DENTRO DO GROWTH OS</Eyebrow>
							<h2>
								Clareza para ver.
								<br />
								<em>Contexto para agir.</em>
							</h2>
							<p>
								Explore três perspectivas da sua operação. Troque as abas e veja
								como o contexto acompanha o time.
							</p>
						</div>
						<ProductDemo />
					</div>
				</section>

				<section className={`${styles.section} ${styles.pipelineSection}`}>
					<div className={`${styles.container} ${styles.featureSplit}`}>
						<div className={styles.featureCopy}>
							<Eyebrow>PIPELINE COM PRÓXIMO PASSO</Eyebrow>
							<h2>
								Cada oportunidade
								<br />
								merece <em>um caminho.</em>
							</h2>
							<p>
								Visualize seus negócios por etapa, acompanhe valores e
								identifique o que precisa avançar. O pipeline deixa de ser uma
								lista e passa a orientar a rotina.
							</p>
							<List
								items={[
									"Etapas do primeiro contato ao fechamento",
									"Valores e responsáveis à vista",
									"Ganho e perdido com histórico",
									"Contexto para orientar seu follow-up",
								]}
							/>
							<Action href="#demonstracao" secondary>
								Explorar o pipeline
							</Action>
						</div>
						<div className={`${styles.featurePreview} ${styles.violetBorder}`}>
							<PipelinePreview framed={false} />
							<span className={styles.previewFootnote}>
								Dados e empresas fictícios · prévia visual
							</span>
						</div>
					</div>
				</section>

				<section className={`${styles.section} ${styles.whatsappSection}`}>
					<div className={`${styles.container} ${styles.featureSplitReverse}`}>
						<div className={`${styles.featurePreview} ${styles.greenBorder}`}>
							<InboxPreview framed={false} />
							<span className={styles.previewFootnote}>
								Demonstração ilustrativa · nenhuma mensagem real
							</span>
						</div>
						<div className={styles.featureCopy}>
							<Eyebrow>WHATSAPP + CONTEXTO COMERCIAL</Eyebrow>
							<h2>
								Uma conversa pode ser
								<br />
								<em>o começo de uma venda.</em>
							</h2>
							<p>
								Conecte atendimento, contato e oportunidade para que sua equipe
								retome a conversa sabendo o que importa.
							</p>
							<List
								items={[
									"Base de integração oficial com a Cloud API",
									"Conversas e estados de entrega",
									"Contato vinculado ao atendimento",
									"Diagnóstico de conexão para a operação",
								]}
							/>
							<p className={styles.finePrint}>
								Disponibilidade sujeita à configuração e às regras da Meta. A
								conexão operacional é validada por workspace.
							</p>
							<Action href={marketing.contact} secondary>
								Conversar sobre a integração
							</Action>
						</div>
					</div>
				</section>

				<section className={`${styles.section} ${styles.automationSection}`}>
					<div className={styles.container}>
						<div className={styles.centerHeading}>
							<Eyebrow>A PRÓXIMA EVOLUÇÃO · EM DESENVOLVIMENTO</Eyebrow>
							<h2>
								Menos repetição.
								<br />
								<em>Mais execução com propósito.</em>
							</h2>
							<p>
								A evolução das automações conecta um evento a uma ação útil, com
								regras, responsáveis e histórico.
							</p>
						</div>
						<div className={styles.automationFlow}>
							<div>
								<span className={`${styles.iconTile} ${styles.green}`}>
									<Icon name="contacts" />
								</span>
								<small>GATILHO</small>
								<h3>Um lead chega</h3>
								<p>Um novo contato entra na operação.</p>
							</div>
							<span className={styles.flowArrow}>
								<Icon name="arrow" />
							</span>
							<div>
								<span className={`${styles.iconTile} ${styles.violet}`}>
									<Icon name="pipeline" />
								</span>
								<small>CONDIÇÃO</small>
								<h3>Existe uma próxima ação?</h3>
								<p>A regra considera o contexto do lead.</p>
							</div>
							<span className={styles.flowArrow}>
								<Icon name="arrow" />
							</span>
							<div>
								<span className={`${styles.iconTile} ${styles.pink}`}>
									<Icon name="tasks" />
								</span>
								<small>AÇÃO</small>
								<h3>Orientar o follow-up</h3>
								<p>Uma tarefa com prazo e responsável.</p>
							</div>
						</div>
						<div className={styles.automationExamples}>
							<span>
								<Icon name="clock" />
								Lead sem retorno → tarefa
							</span>
							<span>
								<Icon name="bell" />
								Negócio parado → alerta
							</span>
							<span>
								<Icon name="send" />
								Proposta enviada → follow-up
							</span>
						</div>
						<p className={styles.finePrintCenter}>
							Fluxos conceituais do roadmap. As regras não estão executando
							ações nesta demonstração.
						</p>
					</div>
				</section>

				<section className={`${styles.section} ${styles.aiSection}`}>
					<div className={`${styles.container} ${styles.featureSplit}`}>
						<div className={styles.featureCopy}>
							<Eyebrow>GROWTH AI · VISÃO DE FUTURO</Eyebrow>
							<h2>
								Inteligência que ajuda.
								<br />
								<em>Você continua no controle.</em>
							</h2>
							<p>
								A próxima camada do Growth OS foi pensada para reduzir o esforço
								de entender uma conversa e escolher uma boa ação.
							</p>
							<List
								items={[
									"Resumos que preservam o contexto",
									"Sugestões de resposta e próxima ação",
									"Priorização de oportunidades",
									"Execução com regras e autorização",
								]}
							/>
							<span className={styles.roadmapBadge}>
								Em desenvolvimento · AI-ready
							</span>
						</div>
						<div className={styles.aiPreview}>
							<div className={styles.aiPreviewHead}>
								<span className={`${styles.iconTile} ${styles.violet}`}>
									<Icon name="ai" />
								</span>
								<div>
									<b>Growth AI</b>
									<small>EXEMPLO CONCEITUAL</small>
								</div>
								<span className={styles.aiStatus}>Assist</span>
							</div>
							<p className={styles.aiPrompt}>
								O que merece atenção na operação hoje?
							</p>
							<div className={styles.aiResponse}>
								<span>
									<Icon name="ai" />
									Contexto antes da ação.
								</span>
								<p>
									A proposta da Clínica Horizonte aguarda retorno. A conversa
									indica interesse em revisar o escopo.
								</p>
								<div>
									<b>Próxima ação sugerida</b>
									<p>
										Agendar uma conversa e confirmar as prioridades antes de
										ajustar a proposta.
									</p>
								</div>
							</div>
							<div className={styles.aiLevels}>
								<span>
									<b>Assist</b>Sugere
								</span>
								<span>
									<b>Copilot</b>Com confirmação
								</span>
								<span>
									<b>Autopilot</b>Com regras
								</span>
							</div>
							<small className={styles.aiFootnote}>
								Conteúdo ilustrativo. Nenhum modelo de IA foi acionado.
							</small>
						</div>
					</div>
				</section>

				<section className={styles.section} id="para-quem">
					<div className={styles.container}>
						<div className={styles.centerHeading}>
							<Eyebrow>PARA EQUIPES QUE QUEREM AVANÇAR</Eyebrow>
							<h2>
								Seu processo é único.
								<br />
								<em>A necessidade de clareza, não.</em>
							</h2>
						</div>
						<div className={styles.audienceGrid}>
							{[
								[
									"Serviços e consultorias",
									"contacts",
									"Conecte diagnóstico, proposta e acompanhamento de cada cliente.",
								],
								[
									"Agências e operações digitais",
									"automation",
									"Mantenha o contexto comercial mesmo quando o time trabalha em várias frentes.",
								],
								[
									"Times de vendas",
									"pipeline",
									"Organize oportunidades, responsáveis e próximos passos em uma rotina compartilhada.",
								],
								[
									"Empresas em crescimento",
									"team",
									"Comece com uma base organizada e amplie a operação por etapas.",
								],
							].map(([title, icon, text]) => (
								<article key={title}>
									<Icon name={icon as IconName} />
									<h3>{title}</h3>
									<p>{text}</p>
								</article>
							))}
						</div>
					</div>
				</section>

				<section className={`${styles.section} ${styles.onboardingSection}`}>
					<div className={styles.container}>
						<div className={styles.sectionHeading}>
							<div>
								<Eyebrow>COMECE COM O QUE IMPORTA</Eyebrow>
								<h2>
									Uma operação melhor.
									<br />
									<em>Um passo de cada vez.</em>
								</h2>
							</div>
							<p>
								O ponto de partida é seu processo comercial. Depois, a
								tecnologia conecta as partes.
							</p>
						</div>
						<ol className={styles.onboardingSteps}>
							{[
								[
									"01",
									"Crie sua base",
									"Acesse sua conta, configure a empresa e organize o workspace.",
								],
								[
									"02",
									"Dê forma ao processo",
									"Cadastre contatos, acompanhe negócios e defina tarefas claras.",
								],
								[
									"03",
									"Conecte e evolua",
									"Valide o WhatsApp e avance para as próximas camadas conforme sua operação.",
								],
							].map(([n, title, description]) => (
								<li key={n}>
									<span>{n}</span>
									<h3>{title}</h3>
									<p>{description}</p>
								</li>
							))}
						</ol>
					</div>
				</section>

				<section
					className={`${styles.section} ${styles.casesSection}`}
					id="cases"
				>
					<div className={`${styles.container} ${styles.caseGrid}`}>
						<div>
							<Eyebrow>CONSTRUÍDO EM PÚBLICO</Eyebrow>
							<h2>
								Resultados merecem
								<br />
								<em>evidência, não promessa.</em>
							</h2>
							<p>
								Estamos construindo o Growth OS com foco em uma operação
								comercial real. Cases, depoimentos e resultados serão publicados
								quando houver evidências e autorização.
							</p>
							<a
								href="https://legendadigital.com.br/building"
								className={styles.textLink}
							>
								Acompanhar a construção <Icon name="arrow" />
							</a>
						</div>
						<div className={styles.caseCard}>
							<Icon name="target" />
							<span>O QUE VAMOS ACOMPANHAR</span>
							<h3>O impacto começa na rotina.</h3>
							<div>
								<span>Tempo de resposta</span>
								<span>Follow-ups realizados</span>
								<span>Conversão por etapa</span>
								<span>Oportunidades sem ação</span>
							</div>
							<small>
								Cases de clientes e métricas de resultados: em breve.
							</small>
						</div>
					</div>
				</section>

				<section
					className={`${styles.section} ${styles.pricingSection}`}
					id="precos"
				>
					<div className={styles.container}>
						<div className={styles.centerHeading}>
							<Eyebrow>UMA PROPOSTA PARA CADA ESTÁGIO</Eyebrow>
							<h2>
								O próximo nível começa
								<br />
								<em>com uma boa conversa.</em>
							</h2>
							<p>
								Conheça a estrutura proposta dos planos. Valores, limites e
								condições serão confirmados antes de qualquer contratação.
							</p>
						</div>
						<div className={styles.pricingGrid}>
							{marketing.plans.map((plan) => (
								<article
									key={plan.name}
									className={`${styles.priceCard} ${plan.featured ? styles.featuredPlan : ""}`}
								>
									{plan.featured && (
										<span className={styles.planRibbon}>
											Para crescer em equipe
										</span>
									)}
									<h3>{plan.name}</h3>
									<p>{plan.audience}</p>
									<div className={styles.planPrice}>
										Em definição<small>Plano comercial em preparação</small>
									</div>
									<List items={plan.features} />
									<Action href={marketing.contact} secondary={!plan.featured}>
										{plan.cta}
									</Action>
								</article>
							))}
						</div>
						<p className={styles.finePrintCenter}>
							Não há cobrança ou assinatura ativada por esta página. Escopo
							final e disponibilidade dos recursos dependem do plano aprovado.
						</p>
					</div>
				</section>

				<section className={`${styles.section} ${styles.faqSection}`} id="faq">
					<div className={`${styles.container} ${styles.faqGrid}`}>
						<div>
							<Eyebrow>DÚVIDAS FREQUENTES</Eyebrow>
							<h2>
								Entenda o produto.
								<br />
								<em>Escolha seu próximo passo.</em>
							</h2>
							<p>A transparência faz parte de uma boa operação.</p>
							<a href={marketing.contact} className={styles.textLink}>
								Falar com a Legenda Digital <Icon name="arrow" />
							</a>
						</div>
						<div className={styles.faqList}>
							{questions.map(({ q, a }) => (
								<details key={q}>
									<summary>
										{q}
										<span aria-hidden="true">+</span>
									</summary>
									<p>{a}</p>
								</details>
							))}
						</div>
					</div>
				</section>

				<section className={styles.finalSection}>
					<div className={`${styles.container} ${styles.finalCard}`}>
						<div className={styles.finalGlow} aria-hidden="true" />
						<Eyebrow>CLAREZA. AÇÃO. CRESCIMENTO.</Eyebrow>
						<h2>
							Pronto para transformar
							<br />
							<em>sua operação comercial?</em>
						</h2>
						<p>
							Conheça o Growth OS e dê forma ao próximo estágio da sua empresa.
						</p>
						<div className={styles.heroActions}>
							<Action>Começar agora</Action>
							<Action href={marketing.contact} secondary>
								Falar com especialista
							</Action>
						</div>
						<span className={styles.finalNote}>
							Um produto Legenda Digital. Construído para evoluir com a sua
							operação.
						</span>
					</div>
				</section>
			</main>
			<footer className={styles.footer}>
				<div className={styles.container}>
					<div className={styles.footerGrid}>
						<div>
							<Brand />
							<p>
								Inteligência prática.
								<br />
								Operações que avançam.
							</p>
							<a
								className={styles.textLink}
								href="https://legendadigital.com.br/"
							>
								Conheça a Legenda Digital <Icon name="arrow" />
							</a>
						</div>
						<div>
							<b>Produto</b>
							<a href="#recursos">Recursos</a>
							<a href="#demonstracao">Demonstração</a>
							<a href="#precos">Planos propostos</a>
							<Link href={marketing.login}>Entrar</Link>
						</div>
						<div>
							<b>Conhecimento</b>
							<a href="https://legendadigital.com.br/conteudos">Conteúdos</a>
							<a href="https://legendadigital.com.br/newsletter">LD Brief</a>
							<a href="https://legendadigital.com.br/building">Building</a>
							<a href="#faq">Perguntas frequentes</a>
						</div>
						<div>
							<b>Legenda Digital</b>
							<a href={marketing.contact}>Contato</a>
							<a href="https://legendadigital.com.br/privacidade">
								Privacidade
							</a>
							<a href="https://legendadigital.com.br/termos">Termos</a>
							<a href="https://www.instagram.com/legenda_digital/">
								Instagram ↗
							</a>
						</div>
					</div>
					<div className={styles.footerBottom}>
						<span>
							© {new Date().getFullYear()} LD Serviços e Soluções Digitais Ltda.
						</span>
						<span>Growth OS · by Legenda Digital</span>
					</div>
				</div>
			</footer>
			<script type="application/ld+json">
				{JSON.stringify(structuredData).replace(/</g, "\\u003c")}
			</script>
		</div>
	);
}
