import type { ContactContext } from "./contact-context";

const uuid =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type ActivationState = { error?: string };

export function activationProgress(context: ContactContext | null) {
	const steps = [!!context, !!context?.stats.deals, !!context?.stats.tasks];
	return {
		steps,
		completed: steps.filter(Boolean).length,
		ready: steps.every(Boolean),
	};
}
export function activationPath(contactId?: string) {
	return contactId && uuid.test(contactId)
		? `/app/start?contact=${contactId}`
		: "/app/start";
}
export function readActivationLead(data: FormData) {
	const name = String(data.get("name") || "").trim();
	const phone = String(data.get("phone") || "").trim();
	const source = String(data.get("source") || "Manual").trim();
	const intakeKey = String(data.get("intakeKey") || "");
	if (name.length < 2 || name.length > 160)
		throw new Error("Use um nome de 2 a 160 caracteres.");
	if (phone.length > 40) throw new Error("Confira o telefone informado.");
	if (!source || source.length > 80)
		throw new Error("Escolha uma origem válida.");
	if (!uuid.test(intakeKey))
		throw new Error("Atualize a página antes de cadastrar o contato.");
	return { name, phone: phone || null, source, intakeKey };
}
