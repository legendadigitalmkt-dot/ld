export const workspaceCookie = "growth-os-workspace";
export const uuidPattern =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function selectWorkspace<T extends { id: string }>(
	items: T[],
	requested?: string,
) {
	return items.find((item) => item.id === requested) || items[0] || null;
}
export function escapeSearch(value: string) {
	return value
		.trim()
		.slice(0, 80)
		.replace(/[\\%_]/g, "\\$&");
}
