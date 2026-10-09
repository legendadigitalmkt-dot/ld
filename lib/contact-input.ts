import { uuidPattern } from "./workspace-selection.ts";

export type ContactDraft = {
	name: string;
	company: string;
	email: string;
	phone: string;
	source: string;
	status: string;
	tags: string;
	owner: string;
};
const limits = {
	name: 160,
	company: 160,
	email: 254,
	phone: 40,
	source: 80,
} as const;
const labels: Record<string, string> = {
	name: "nome",
	company: "empresa",
	email: "e-mail",
	phone: "telefone",
	source: "origem",
};
export function readContactInput(form: FormData) {
	const values = Object.fromEntries(
		Object.keys(limits).map((key) => [key, String(form.get(key) || "").trim()]),
	);
	for (const [key, limit] of Object.entries(limits)) {
		if (values[key].length > limit)
			throw new Error(`O campo ${labels[key]} ultrapassa o limite permitido.`);
	}
	if (values.name.length < 2)
		throw new Error("Informe um nome com pelo menos 2 caracteres.");
	if (!values.source) throw new Error("Informe a origem do contato.");
	if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
		throw new Error("Confira o e-mail do contato.");
	const status = String(form.get("status") || "");
	if (status !== "lead" && status !== "customer" && status !== "inactive")
		throw new Error("Escolha um status válido.");
	const owner = String(form.get("owner") || "");
	if (owner && !uuidPattern.test(owner))
		throw new Error("Escolha um responsável válido.");
	const rawTags = String(form.get("tags") || "");
	if (rawTags.length > 400)
		throw new Error("Use no máximo 10 tags de até 32 caracteres.");
	const tags = [
		...new Set(
			rawTags
				.split(",")
				.map((tag) => tag.trim())
				.filter(Boolean),
		),
	];
	if (tags.length > 10 || tags.some((tag) => tag.length > 32))
		throw new Error("Use no máximo 10 tags de até 32 caracteres.");
	return {
		name: values.name,
		company: values.company || null,
		email: values.email || null,
		phone: values.phone || null,
		source: values.source,
		status: status as "lead" | "customer" | "inactive",
		tags,
		owner: owner || null,
	};
}
export function readContactNote(form: FormData) {
	const body = String(form.get("body") || "").trim();
	const requestId = String(form.get("requestId") || "");
	if (body.length < 2 || body.length > 4000)
		throw new Error("A nota deve ter entre 2 e 4.000 caracteres.");
	if (!uuidPattern.test(requestId))
		throw new Error("Atualize o perfil antes de adicionar a nota.");
	return { body, requestId };
}
