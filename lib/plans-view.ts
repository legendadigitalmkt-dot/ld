import type { ModuleCode } from "./product-view";
export const usageResources = [
	"contacts",
	"deals",
	"tasks",
	"members",
] as const;
export type UsageResource = (typeof usageResources)[number];
export const usageLabels: Record<UsageResource, string> = {
	contacts: "Contatos",
	deals: "Oportunidades",
	tasks: "Tarefas",
	members: "Membros",
};
export type PlanConfig = {
	features: Record<ModuleCode, boolean>;
	limits: Record<UsageResource, number | null>;
};
export type PlanStatus = "draft" | "active" | "archived";
export const planStatusLabels: Record<PlanStatus, string> = {
	draft: "Rascunho",
	active: "Ativo",
	archived: "Arquivado",
};
export type PlanVersion = {
	id: string;
	plan_id: string;
	name: string;
	description: string;
	version: number;
	config: PlanConfig;
	published_at: string;
};
export type PlanSummary = {
	id: string;
	code: string;
	name: string;
	description: string;
	status: PlanStatus;
	revision: number;
	latest_version: number;
	published_revision: number;
};
export type PlanDetail = PlanSummary & {
	draft_config: PlanConfig;
	versions: PlanVersion[];
};
export type WorkspaceUsage = {
	workspace_id: string;
	assignment_revision: number;
	reserved_members: number;
	plan: {
		id: string;
		version_id: string;
		name: string;
		version: number;
	} | null;
	used: Record<UsageResource, number>;
	limits: PlanConfig["limits"];
	features: PlanConfig["features"];
};
export type PlansCatalog = {
	items: PlanSummary[];
	total: number;
	detail: PlanDetail | null;
	workspaces: { id: string; name: string }[];
	total_workspaces: number;
	workspace: {
		id: string;
		name: string;
		protected: boolean;
		status: "active" | "suspended";
		usage: WorkspaceUsage;
	} | null;
};
export function planLimit(value: unknown): number | null {
	if (value === "") return null;
	if (
		typeof value !== "string" ||
		!/^(0|[1-9]\d{0,7})$/.test(value) ||
		Number(value) > 10000000
	)
		throw new Error(
			"Limite inválido. Use um inteiro entre 0 e 10.000.000, ou deixe vazio.",
		);
	return Number(value);
}
export function readPlanDraft(form: FormData) {
	const code = form.get("code"),
		name = form.get("name"),
		description = form.get("description"),
		status = form.get("status");
	if (
		typeof code !== "string" ||
		!/^[a-z][a-z0-9_-]{1,47}$/.test(code) ||
		typeof name !== "string" ||
		name.trim().length < 2 ||
		name.trim().length > 80 ||
		typeof description !== "string" ||
		description.length > 300 ||
		!["draft", "active", "archived"].includes(String(status))
	)
		throw new Error("Confira código, nome, descrição e estado do plano.");
	const features = {
		crm: form.get("crm") === "on",
		whatsapp: form.get("whatsapp") === "on",
		growth_ai: form.get("growth_ai") === "on",
	};
	if (features.growth_ai && !features.crm)
		throw new Error(
			"Growth AI depende do CRM. Inclua CRM ou desmarque Growth AI.",
		);
	const limits = Object.fromEntries(
		usageResources.map((key) => [key, planLimit(form.get(key))]),
	) as PlanConfig["limits"];
	return {
		code,
		name: name.trim(),
		description,
		status: status as PlanStatus,
		config: { features, limits },
	};
}
export function usageState(used: number, limit: number | null) {
	return limit === null
		? "unconfigured"
		: used > limit
			? "over"
			: used === limit
				? "full"
				: "available";
}
export function planLimitError(code: string | undefined): string | null {
	return code === "PGL01"
		? "Limite do plano atingido. Confira Plano e consumo nas configurações do workspace."
		: null;
}
