import { deadlineAtEndOfDay } from "./task-input.ts";

export type TodayTask = {
	id: string;
	title: string;
	priority: string;
	due_at: string | null;
	assignee_user_id: string | null;
	contact_id: string | null;
	deal_id: string | null;
	contact_name: string | null;
	company: string | null;
	deal_title: string | null;
};
export type FollowupContact = {
	id: string;
	name: string;
	company: string | null;
	source: string;
	open_task_id: string | null;
};
export type FollowupDeal = {
	id: string;
	title: string;
	stage: string;
	value: number;
	last_activity_at: string;
	contact_id: string;
	contact: FollowupContact;
	open_task_id: string | null;
};
export type FollowupSuggestion = {
	contact: FollowupContact;
	deal: FollowupDeal | null;
	kind: "idle" | "no_followup";
	task_id: string | null;
	task_title: string;
	priority: "high" | "medium";
};
export type TaskView = "all" | "today" | "overdue" | "undated" | "upcoming";

export function workspaceDay(value: string, timezone: string) {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(new Date(value));
	const get = (type: string) => parts.find((part) => part.type === type)?.value;
	return `${get("year")}-${get("month")}-${get("day")}`;
}
export function workspaceDayBounds(asOf: string, timezone: string) {
	const day = workspaceDay(asOf, timezone);
	const previous = new Date(Date.parse(`${day}T12:00:00Z`) - 86_400_000)
		.toISOString()
		.slice(0, 10);
	return {
		day,
		start: new Date(
			Date.parse(deadlineAtEndOfDay(previous, timezone)) + 1,
		).toISOString(),
		end: new Date(
			Date.parse(deadlineAtEndOfDay(day, timezone)) + 1,
		).toISOString(),
	};
}
export function taskIsOverdue(task: TodayTask, asOf: string) {
	return !!task.due_at && Date.parse(task.due_at) < Date.parse(asOf);
}
function normalize(value: string) {
	return value
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLocaleLowerCase("pt-BR");
}
export function selectTodayTasks(
	tasks: TodayTask[],
	options: {
		view: TaskView;
		owner: string;
		query: string;
		userId: string;
		asOf: string;
		timezone: string;
	},
) {
	const day = workspaceDay(options.asOf, options.timezone);
	const query = normalize(options.query.trim());
	const isToday = (task: TodayTask) =>
		!!task.due_at && workspaceDay(task.due_at, options.timezone) === day;
	const rank = (task: TodayTask) =>
		taskIsOverdue(task, options.asOf) ? 0 : isToday(task) ? 1 : 2;
	const priority = (task: TodayTask) =>
		task.priority === "high" ? 0 : task.priority === "medium" ? 1 : 2;
	return tasks
		.filter((task) => {
			if (options.owner === "mine" && task.assignee_user_id !== options.userId)
				return false;
			if (options.owner === "unassigned" && task.assignee_user_id) return false;
			if (options.view === "overdue" && !taskIsOverdue(task, options.asOf))
				return false;
			if (options.view === "today" && !isToday(task)) return false;
			if (options.view === "undated" && task.due_at) return false;
			if (
				options.view === "upcoming" &&
				(!task.due_at || workspaceDay(task.due_at, options.timezone) <= day)
			)
				return false;
			return (
				!query ||
				normalize(
					[task.title, task.contact_name, task.company, task.deal_title]
						.filter(Boolean)
						.join(" "),
				).includes(query)
			);
		})
		.sort(
			(a, b) =>
				rank(a) - rank(b) ||
				priority(a) - priority(b) ||
				(a.due_at ? Date.parse(a.due_at) : Infinity) -
					(b.due_at ? Date.parse(b.due_at) : Infinity) ||
				a.id.localeCompare(b.id),
		);
}
const stages = ["new", "contacted", "qualified", "proposal", "negotiation"];
function suggestedTitle(name: string, stage: string) {
	const action =
		stage === "negotiation"
			? "Definir próximo passo da negociação com"
			: stage === "proposal"
				? "Retomar proposta com"
				: stage === "qualified"
					? "Preparar proposta para"
					: stage === "contacted"
						? "Qualificar interesse de"
						: "Fazer primeiro contato com";
	return `${action} ${name}`.slice(0, 180);
}
export function buildFollowupSuggestions(
	contacts: FollowupContact[],
	deals: FollowupDeal[],
	idleIds: string[],
	missingIds: string[],
	asOf: string,
) {
	const idle = new Set(idleIds);
	const missing = new Set(missingIds);
	const suggestions: FollowupSuggestion[] = [];
	for (const deal of deals) {
		if (!stages.includes(deal.stage)) continue;
		const taskId = deal.open_task_id || deal.contact.open_task_id;
		const isIdle =
			idle.has(deal.id) &&
			Date.parse(asOf) - Date.parse(deal.last_activity_at) >= 86_400_000;
		if (!isIdle && (!missing.has(deal.contact_id) || taskId)) continue;
		suggestions.push({
			contact: deal.contact,
			deal,
			kind: isIdle ? "idle" : "no_followup",
			task_id: taskId,
			task_title: suggestedTitle(deal.contact.name, deal.stage),
			priority: ["proposal", "negotiation"].includes(deal.stage)
				? "high"
				: "medium",
		});
	}
	for (const contact of contacts) {
		if (
			!missing.has(contact.id) ||
			contact.open_task_id ||
			suggestions.some((item) => item.contact.id === contact.id)
		)
			continue;
		suggestions.push({
			contact,
			deal: null,
			kind: "no_followup",
			task_id: null,
			task_title: `Definir próximo passo com ${contact.name}`.slice(0, 180),
			priority: "medium",
		});
	}
	suggestions.sort(
		(a, b) =>
			Number(b.kind === "idle") - Number(a.kind === "idle") ||
			stages.indexOf(b.deal?.stage || "new") -
				stages.indexOf(a.deal?.stage || "new") ||
			(b.deal?.value || 0) - (a.deal?.value || 0) ||
			(a.deal ? Date.parse(a.deal.last_activity_at) : Infinity) -
				(b.deal ? Date.parse(b.deal.last_activity_at) : Infinity) ||
			a.contact.id.localeCompare(b.contact.id),
	);
	const seen = new Set<string>();
	return suggestions.filter((item) => {
		if (seen.has(item.contact.id)) return false;
		seen.add(item.contact.id);
		return true;
	});
}
