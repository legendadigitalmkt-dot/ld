export function readWorkspaceInput(form: FormData) {
	const name = String(form.get("name") || "").trim();
	const segment = String(form.get("segment") || "").trim();
	const timezone = String(form.get("timezone") || "").trim();
	if (name.length < 2 || name.length > 120)
		throw new Error("Use um nome de 2 a 120 caracteres.");
	if (segment.length > 160)
		throw new Error("O segmento deve ter até 160 caracteres.");
	if (!timezone || timezone.length > 80)
		throw new Error("Selecione um fuso horário válido.");
	try {
		new Intl.DateTimeFormat("pt-BR", { timeZone: timezone }).format(new Date());
	} catch {
		throw new Error("Selecione um fuso horário válido.");
	}
	return { name, segment: segment || null, timezone };
}
