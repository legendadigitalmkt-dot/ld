// Commercial settings live here; prices are deliberately unset until approved.
export const navigation = [
	["Produto", "#produto"],
	["Soluções", "#solucoes"],
	["Recursos", "#recursos"],
	["Para quem", "#para-quem"],
	["Preços", "#precos"],
	["Cases", "#cases"],
	["Conteúdo", "https://legendadigital.com.br/conteudos"],
	["FAQ", "#faq"],
] as const;

export const marketing = {
	url: "https://app.legendadigital.com.br",
	description:
		"CRM, pipeline, WhatsApp e tarefas para conectar sua operação comercial. Conheça o Growth OS, o sistema operacional de crescimento da Legenda Digital.",
	login: "/login",
	contact:
		"mailto:legendadigitalmkt@gmail.com?subject=Quero%20conhecer%20o%20Growth%20OS",
	plans: [
		{
			name: "Starter",
			audience: "Para organizar os primeiros passos.",
			price: null,
			featured: false,
			features: [
				"Contatos e histórico comercial",
				"Pipeline de oportunidades",
				"Tarefas e próximos passos",
				"Visão geral da operação",
			],
			cta: "Conhecer o Starter",
		},
		{
			name: "Professional",
			audience: "Para conectar uma equipe em crescimento.",
			price: null,
			featured: true,
			features: [
				"Tudo da proposta Starter",
				"Operação em equipe",
				"Inbox com WhatsApp Cloud API",
				"Evolução de relatórios e follow-up",
			],
			cta: "Conversar sobre o Professional",
		},
		{
			name: "Business",
			audience: "Para operações com necessidades próprias.",
			price: null,
			featured: false,
			features: [
				"Diagnóstico da operação",
				"Planejamento de implantação",
				"Configuração do workspace",
				"Escopo de integrações sob avaliação",
			],
			cta: "Falar com a Legenda Digital",
		},
	],
} as const;

export const questions = [
	{
		q: "O que é o Growth OS?",
		a: "É o sistema operacional comercial da Legenda Digital. A proposta é conectar contatos, oportunidades, conversas, tarefas e dados para que o time saiba o que fazer a seguir. O produto está em evolução, com CRM, pipeline, tarefas e uma base de integração com WhatsApp já implementados.",
	},
	{
		q: "É um CRM?",
		a: "O CRM é a base. O Growth OS conecta essa base ao pipeline, às tarefas e ao contexto de atendimento, com evolução planejada de automações, relatórios e inteligência comercial.",
	},
	{
		q: "Integra com o WhatsApp?",
		a: "A integração usa a WhatsApp Cloud API oficial da Meta. A operação depende da configuração e aprovação da conta e do número da empresa, das permissões da Meta e das regras de mensagens e modelos. A disponibilidade para cada workspace deve ser validada na implantação.",
	},
	{
		q: "Serve para pequenas empresas?",
		a: "A experiência foi pensada para empresas que precisam organizar leads e vendas com uma rotina clara. A implantação pode começar com contatos, pipeline e tarefas, antes de avançar para integrações.",
	},
	{
		q: "Posso usar com minha equipe?",
		a: "A base do produto inclui workspaces, membros e funções de acesso. Cada pessoa deve operar com sua própria conta e com as permissões definidas para o workspace.",
	},
	{
		q: "Como meus dados são protegidos?",
		a: "A aplicação utiliza autenticação e políticas de acesso no banco para separar dados entre workspaces. A configuração de acessos, recuperação e operação é parte da implantação. A equipe deve usar credenciais próprias e manter seus acessos atualizados.",
	},
	{
		q: "Funciona no celular?",
		a: "O acesso é pelo navegador. Esta página é responsiva, e a evolução da área operacional inclui adaptação de contatos, conversas e pipeline para telas menores.",
	},
	{
		q: "É possível importar contatos?",
		a: "O cadastro manual está disponível na base atual. Importação em lote e exportação fazem parte da evolução do CRM; formato, validação e disponibilidade serão confirmados antes da contratação.",
	},
	{
		q: "Já possui automações?",
		a: "A proposta de automações segue gatilho, condição e ação, com rastreabilidade. A execução de regras e o follow-up automático ainda estão em desenvolvimento. Os fluxos apresentados nesta página são demonstrações conceituais.",
	},
	{
		q: "Já possui inteligência artificial?",
		a: "Growth AI é a próxima camada do produto. Resumos, sugestões e priorização estão no roadmap. As demonstrações são ilustrativas; não representam um serviço de IA ativo nem enviam mensagens reais.",
	},
	{
		q: "Como funciona o onboarding?",
		a: "A base atual permite criar um workspace após a autenticação. A evolução da implantação acompanha empresa, equipe, pipeline, conexão com WhatsApp e primeiro lead, conforme o escopo combinado.",
	},
	{
		q: "Quais são os preços e como funciona o suporte?",
		a: "Planos, valores, limites e condições de suporte estão em definição. Fale com a Legenda Digital para avaliar a operação. Esta página não realiza cobrança, não promete teste gratuito e não ativa assinatura.",
	},
] as const;
