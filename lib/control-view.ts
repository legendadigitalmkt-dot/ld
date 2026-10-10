export const platformRoles = [
	"platform_owner",
	"super_admin",
	"product_admin",
	"billing_admin",
	"sales_admin",
	"marketing_admin",
	"support_admin",
	"security_admin",
	"content_admin",
	"analyst",
	"viewer",
] as const;
export type PlatformRole = (typeof platformRoles)[number];
export type ControlPermission =
	| "platform.access"
	| "overview.read"
	| "product.read"
	| "feature_flags.manage"
	| "plans.read"
	| "plans.write"
	| "users.read"
	| "users.suspend"
	| "workspaces.read"
	| "workspaces.suspend"
	| "roles.read"
	| "roles.manage"
	| "audit.read"
	| "settings.read"
	| "system.settings";
export type PlatformContext = {
	eligible: boolean;
	mfa_verified: boolean;
	user_id?: string;
	owner_workspace?: {
		id: string;
		name: string;
		workspace_type: "platform_owner";
	};
	roles: PlatformRole[];
	permissions: ControlPermission[];
	presentation?: { display_name: string; timezone: string };
};
export const controlNavigation = [
	{
		href: "/control-center",
		label: "Overview",
		icon: "dashboard",
		permission: "overview.read",
		group: "Controle",
	},
	{
		href: "/control-center/product",
		label: "Product",
		icon: "integrations",
		permission: "product.read",
		group: "Produto",
	},
	{
		href: "/control-center/plans",
		label: "Plans",
		icon: "reports",
		permission: "plans.read",
		group: "Produto",
	},
	{
		href: "/control-center/users",
		label: "Users",
		icon: "contacts",
		permission: "users.read",
		group: "Plataforma",
	},
	{
		href: "/control-center/workspaces",
		label: "Workspaces",
		icon: "team",
		permission: "workspaces.read",
		group: "Plataforma",
	},
	{
		href: "/control-center/permissions",
		label: "Permissões",
		icon: "shield",
		permission: "roles.read",
		group: "Governança",
	},
	{
		href: "/control-center/audit",
		label: "Audit Logs",
		icon: "clock",
		permission: "audit.read",
		group: "Governança",
	},
	{
		href: "/control-center/settings",
		label: "Settings",
		icon: "settings",
		permission: "settings.read",
		group: "Governança",
	},
] as const;
export const controlRoleLabels: Record<PlatformRole, string> = {
	platform_owner: "Platform Owner",
	super_admin: "Super Admin",
	product_admin: "Produto",
	billing_admin: "Billing",
	sales_admin: "Comercial",
	marketing_admin: "Marketing",
	support_admin: "Suporte",
	security_admin: "Segurança",
	content_admin: "Conteúdo",
	analyst: "Analista",
	viewer: "Leitura",
};
export function controlQuery(
	params: Record<string, string | string[] | undefined>,
) {
	const raw =
		typeof params.page === "string" && /^\d{1,5}$/.test(params.page)
			? Number(params.page)
			: 1;
	return {
		query: typeof params.q === "string" ? params.q.trim().slice(0, 80) : "",
		page: Math.max(1, Math.min(10000, raw)),
		status:
			params.status === "suspended" || params.status === "active"
				? params.status
				: "all",
	} as const;
}
export function adminReason(value: unknown, confirmation: unknown) {
	if (confirmation !== "confirm")
		throw new Error("Confirme a ação antes de continuar.");
	const reason = typeof value === "string" ? value.trim() : "";
	if (reason.length < 10 || reason.length > 500)
		throw new Error("Informe um motivo com 10 a 500 caracteres.");
	return reason;
}
export function adminUUID(value: unknown) {
	if (
		typeof value !== "string" ||
		!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
			value,
		)
	)
		throw new Error("Identificador inválido.");
	return value;
}
export function assignableRole(
	value: unknown,
): Exclude<PlatformRole, "platform_owner"> {
	if (
		typeof value !== "string" ||
		value === "platform_owner" ||
		!platformRoles.includes(value as PlatformRole)
	)
		throw new Error("Papel administrativo inválido.");
	return value as Exclude<PlatformRole, "platform_owner">;
}
export type AdminAudit = {
	id: string;
	actor: string | null;
	actor_id: string | null;
	actor_type: "admin" | "system";
	action: string;
	entity_type: string;
	entity_id: string | null;
	before: Record<string, unknown> | null;
	after: Record<string, unknown> | null;
	reason: string;
	created_at: string;
};
export type ControlUser = {
	id: string;
	email: string | null;
	name: string | null;
	status: "active" | "suspended";
	confirmed: boolean;
	created_at: string;
	last_sign_in_at: string | null;
	sessions: number;
	verified_mfa: boolean;
	memberships: { id: string; name: string; role: string }[];
	platform_roles: PlatformRole[];
	protected: boolean;
};
export type ControlWorkspace = {
	id: string;
	name: string;
	slug: string;
	status: "active" | "suspended";
	workspace_type: "customer" | "platform_owner";
	created_at: string;
	members: number;
	contacts: number;
	deals: number;
	open_tasks: number;
	owners: string[];
	integrations: { provider: string; status: string }[];
};
export type ControlPage<T> = {
	items: T[];
	total: number;
	page: number;
	page_size: number;
};
export type ControlSettings = {
	display_name: string;
	timezone: string;
	support_email: string | null;
	revision: number;
	updated_at: string;
};
export type ControlOverview = {
	as_of: string;
	users: number;
	new_users_7d: number;
	workspaces: number;
	suspended_users: number;
	suspended_workspaces: number;
	platform_admins: number;
	audit: AdminAudit[] | null;
};
export type AdminActionState = { error?: string; message?: string };
export function totpImage(qr: string) {
	if (qr.startsWith("data:image/svg+xml;")) return qr;
	if (qr.startsWith("<svg"))
		return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr)}`;
	throw new Error("QR code inválido.");
}
export type ControlRoles = {
	catalog: {
		code: PlatformRole;
		label: string;
		description: string;
		permissions: ControlPermission[];
	}[];
	members: { id: string; email: string | null; roles: PlatformRole[] }[];
};
