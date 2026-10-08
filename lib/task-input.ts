export function deadlineAtEndOfDay(day: string, timezone: string) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(day))
		throw new Error("Informe uma data válida.");
	const desired = Date.parse(`${day}T23:59:59.999Z`);
	if (
		!Number.isFinite(desired) ||
		new Date(desired).toISOString().slice(0, 10) !== day
	)
		throw new Error("Informe uma data válida.");
	const formatter = new Intl.DateTimeFormat("en-US", {
		timeZone: timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23",
	});
	let instant = desired;
	for (let attempt = 0; attempt < 3; attempt++) {
		const parts = Object.fromEntries(
			formatter
				.formatToParts(new Date(instant))
				.map((part) => [part.type, part.value]),
		);
		const represented = Date.UTC(
			Number(parts.year),
			Number(parts.month) - 1,
			Number(parts.day),
			Number(parts.hour),
			Number(parts.minute),
			Number(parts.second),
			999,
		);
		const correction = desired - represented;
		instant += correction;
		if (correction === 0) return new Date(instant).toISOString();
	}
	throw new Error(
		"Não foi possível interpretar esse prazo no fuso da empresa.",
	);
}
export function readTaskInput(
	data: FormData,
	timezone: string,
): {
	title: string;
	priority: "low" | "medium" | "high";
	due_at: string | null;
} {
	const title = String(data.get("title") || "").trim();
	if (title.length < 2 || title.length > 180)
		throw new Error("Use um título de 2 a 180 caracteres.");
	const priority = String(data.get("priority") || "medium");
	if (priority !== "low" && priority !== "medium" && priority !== "high")
		throw new Error("Selecione uma prioridade válida.");
	const day = String(data.get("dueDate") || "");
	return {
		title,
		priority,
		due_at: day ? deadlineAtEndOfDay(day, timezone) : null,
	};
}
