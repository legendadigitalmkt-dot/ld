type RecordValue = Record<string, unknown>;
function record(value: unknown): RecordValue {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as RecordValue)
		: {};
}

export type TemplateVariable = {
	field: string;
	component: "header" | "body";
	key: string;
	named: boolean;
};
export type WhatsAppTemplate = {
	id: string;
	name: string;
	language: string;
	category: string;
	header: string;
	body: string;
	footer: string;
	variables: TemplateVariable[];
	unsupportedReason: string | null;
};
export type TemplateComponent = {
	type: "header" | "body";
	parameters: Array<{ type: "text"; text: string; parameter_name?: string }>;
};

// Only approved text templates are exposed; media, buttons, flows and OTP need their own composer.
export function parseApprovedTemplates(value: unknown): WhatsAppTemplate[] {
	const data = record(value).data;
	if (!Array.isArray(data))
		throw new Error("A Meta retornou uma lista de templates inválida.");
	return data.flatMap((item) => {
		const template = record(item);
		if (template.status !== "APPROVED") return [];
		if (
			typeof template.id !== "string" ||
			typeof template.name !== "string" ||
			typeof template.language !== "string"
		)
			return [];
		const components = Array.isArray(template.components)
			? template.components.map(record)
			: [];
		let unsupportedReason: string | null = null;
		const texts = { header: "", body: "", footer: "" };
		const variables: TemplateVariable[] = [];
		const seen = new Set<string>();
		for (const component of components) {
			const type =
				typeof component.type === "string" ? component.type.toLowerCase() : "";
			if (
				!(type === "header" || type === "body" || type === "footer") ||
				seen.has(type)
			) {
				unsupportedReason =
					"Este template usa mídia, botões ou componentes ainda não suportados pelo Inbox.";
				continue;
			}
			seen.add(type);
			if (type === "header" && component.format !== "TEXT") {
				unsupportedReason =
					"Templates com cabeçalho de mídia ainda não podem ser enviados pelo Inbox.";
				continue;
			}
			if (typeof component.text !== "string") {
				unsupportedReason = "O texto deste template não pôde ser carregado.";
				continue;
			}
			texts[type] = component.text;
			const keys = [
				...new Set(
					[...component.text.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)].map(
						(match) => match[1].trim(),
					),
				),
			];
			if (!keys.length) continue;
			if (type === "footer") {
				unsupportedReason = "Rodapés com variáveis não são suportados.";
				continue;
			}
			const named = keys.every((key) => /^[a-z][a-z0-9_]*$/.test(key));
			const positional = keys.every((key) => /^[1-9]\d*$/.test(key));
			if (!named && !positional) {
				unsupportedReason = "As variáveis deste template não são suportadas.";
				continue;
			}
			const ordered = named ? keys : keys.sort((a, b) => Number(a) - Number(b));
			if (
				positional &&
				ordered.some((key, index) => Number(key) !== index + 1)
			) {
				unsupportedReason =
					"A numeração das variáveis deste template não é válida.";
			}
			if (ordered.length > 20)
				unsupportedReason =
					"Este template excede o limite de variáveis do Inbox.";
			for (const key of ordered)
				variables.push({
					field: `${type}_${key}`,
					component: type,
					key,
					named,
				});
		}
		if (!texts.body)
			unsupportedReason =
				"Este template não possui um corpo de texto disponível.";
		if (template.category === "AUTHENTICATION")
			unsupportedReason =
				"Templates de autenticação precisam de um fluxo de código dedicado.";
		return [
			{
				id: template.id,
				name: template.name,
				language: template.language,
				category:
					typeof template.category === "string" ? template.category : "",
				...texts,
				variables,
				unsupportedReason,
			},
		];
	});
}

export function renderTemplate(
	template: WhatsAppTemplate,
	values: Record<string, string>,
) {
	return (["header", "body", "footer"] as const)
		.map((component) =>
			template[component].replace(
				/\{\{\s*([^{}]+?)\s*\}\}/g,
				(original, key: string) =>
					values[`${component}_${key.trim()}`]?.trim() || original,
			),
		)
		.filter(Boolean)
		.join("\n\n");
}

export function prepareTemplateMessage(
	template: WhatsAppTemplate,
	values: Record<string, string>,
) {
	if (template.unsupportedReason) throw new Error(template.unsupportedReason);
	const components: TemplateComponent[] = [];
	for (const component of ["header", "body"] as const) {
		const variables = template.variables.filter(
			(variable) => variable.component === component,
		);
		if (!variables.length) continue;
		const parameters = variables.map((variable) => {
			const text = (values[variable.field] || "").trim();
			const max = component === "header" ? 60 : 1024;
			if (!text || text.length > max)
				throw new Error(
					`Preencha ${variable.field} com 1 a ${max} caracteres.`,
				);
			return {
				type: "text" as const,
				text,
				...(variable.named ? { parameter_name: variable.key } : {}),
			};
		});
		components.push({ type: component, parameters });
	}
	const body = renderTemplate(template, values);
	if (body.length > 4096)
		throw new Error("O template preenchido excede 4096 caracteres.");
	return { components, body };
}
