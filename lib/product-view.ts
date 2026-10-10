export const moduleCodes = ["crm", "whatsapp", "growth_ai"] as const;
export type ModuleCode = (typeof moduleCodes)[number];
export type ModuleState = "enabled" | "beta" | "disabled";
export type RuleState = ModuleState | "inherit";
export type ModuleAccess = {
	enabled: boolean;
	state: ModuleState;
	source: "global" | "workspace" | "dependency" | "unavailable" | "plan";
};
export type WorkspaceModules = Record<ModuleCode, ModuleAccess>;
export const moduleLabels: Record<ModuleCode, string> = {
	crm: "CRM e operação",
	whatsapp: "WhatsApp",
	growth_ai: "Growth AI",
};
export const moduleStateLabels: Record<RuleState, string> = {
	enabled: "Ativo",
	beta: "Beta",
	disabled: "Desativado",
	inherit: "Herdar da plataforma",
};
export const moduleSourceLabels: Record<ModuleAccess["source"], string> = {
	global: "Regra da plataforma",
	workspace: "Regra do workspace",
	dependency: "CRM desativado",
	unavailable: "Indisponível",
	plan: "Não incluído no plano atribuído",
};
export function moduleCode(value: unknown): ModuleCode {
	if (typeof value !== "string" || !moduleCodes.includes(value as ModuleCode))
		throw new Error("Módulo inválido.");
	return value as ModuleCode;
}
export function ruleState(value: unknown, workspace: boolean): RuleState {
	if (
		typeof value !== "string" ||
		![
			"enabled",
			"beta",
			"disabled",
			...(workspace ? ["inherit"] : []),
		].includes(value)
	)
		throw new Error("Regra inválida.");
	return value as RuleState;
}
export function ruleRevision(value: unknown, minimum: number): number {
	if (typeof value !== "string" || !/^(0|[1-9]\d{0,14})$/.test(value))
		throw new Error("Versão inválida. Atualize a página.");
	const revision = Number(value);
	if (!Number.isSafeInteger(revision) || revision < minimum)
		throw new Error("Versão inválida. Atualize a página.");
	return revision;
}
export function enabledModules(modules: WorkspaceModules): ModuleCode[] {
	return moduleCodes.filter((code) => modules[code]?.enabled === true);
}
export type ProductFeature = {
	code: ModuleCode;
	label: string;
	description: string;
	capabilities: string[];
	global: { state: ModuleState; revision: number; updated_at: string };
	rule: { state: RuleState; revision: number; updated_at: string | null };
	effective: ModuleAccess;
};
export type ProductCatalog = {
	workspace: {
		id: string;
		name: string;
		status: "active" | "suspended";
	} | null;
	workspaces: { id: string; name: string }[];
	total_workspaces: number;
	features: ProductFeature[];
};
