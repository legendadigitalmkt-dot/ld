export function mobilePreviewTarget(screen: unknown, contact: unknown) {
	const targets: Record<string, string> = {
		today: "/app/today",
		results: "/app/results",
		start: "/app/start",
		pipeline: "/app/pipeline",
		contacts: "/app/contacts",
		tasks: "/app/tasks",
	};
	if (
		screen === "contact" &&
		typeof contact === "string" &&
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
			contact,
		)
	)
		return `/app/contacts/${contact}`;
	return typeof screen === "string"
		? targets[screen] || "/app/today"
		: "/app/today";
}
export function mobilePreviewWidth(value: unknown) {
	return value === "360" ? 360 : value === "430" ? 430 : 390;
}
