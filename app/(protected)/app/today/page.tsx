import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { requireWorkspace } from "@/lib/workspace";
import type { Overview } from "@/lib/operational";
import {
	buildFollowupSuggestions,
	workspaceDayBounds,
	type FollowupDeal,
} from "@/lib/today-view";
import { TodayBoard } from "./today-board";

export default async function TodayPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const workspace = await requireWorkspace();
	const params = await searchParams;
	const supabase = await createClient();
	const asOf = new Date().toISOString();
	const bounds = workspaceDayBounds(asOf, workspace.timezone);
	const [user, taskResult, overviewResult, todayOpen, todayDone] =
		await Promise.all([
			requireUser(),
			supabase
				.from("tasks")
				.select(
					"id,title,priority,due_at,assignee_user_id,contact_id,deal_id,contacts!tasks_contact_same_workspace(name,company),deals!tasks_deal_same_workspace(title)",
					{ count: "exact" },
				)
				.eq("workspace_id", workspace.id)
				.eq("status", "open")
				.order("due_at", { ascending: true, nullsFirst: false })
				.order("id")
				.limit(1000),
			supabase.rpc("growth_overview", {
				p_workspace_id: workspace.id,
				p_days: 30,
			}),
			supabase
				.from("tasks")
				.select("id", { count: "exact", head: true })
				.eq("workspace_id", workspace.id)
				.eq("status", "open")
				.gte("due_at", bounds.start)
				.lt("due_at", bounds.end),
			supabase
				.from("tasks")
				.select("id", { count: "exact", head: true })
				.eq("workspace_id", workspace.id)
				.eq("status", "done")
				.gte("due_at", bounds.start)
				.lt("due_at", bounds.end),
		]);
	if (
		taskResult.error ||
		overviewResult.error ||
		!overviewResult.data ||
		todayOpen.error ||
		todayDone.error
	)
		throw new Error("Não foi possível carregar sua rotina comercial.");
	const overview = overviewResult.data as unknown as Overview;
	const missingIds = overview.followups.map((item) => item.id);
	const idleIds = overview.attention.map((item) => item.id);
	const contactQuery = missingIds.length
		? supabase
				.from("contacts")
				.select(
					"id,name,company,source,pending:tasks!tasks_contact_same_workspace(id)",
				)
				.eq("workspace_id", workspace.id)
				.in("id", missingIds)
				.eq("pending.status", "open")
				.limit(1, { referencedTable: "pending" })
		: Promise.resolve({ data: [], error: null });
	const dealColumns =
		"id,title,stage,value,last_activity_at,contact_id,pending:tasks!tasks_deal_same_workspace(id),contacts!deals_contact_same_workspace(id,name,company,source,pending:tasks!tasks_contact_same_workspace(id))" as const;
	const dealQuery = () =>
		supabase
			.from("deals")
			.select(dealColumns, { count: "exact" })
			.eq("workspace_id", workspace.id)
			.in("stage", ["new", "contacted", "qualified", "proposal", "negotiation"])
			.eq("pending.status", "open")
			.eq("contacts.pending.status", "open")
			.limit(1, { referencedTable: "pending" })
			.limit(1, { referencedTable: "contacts.pending" })
			.order("last_activity_at")
			.order("id")
			.limit(1000);
	const [contactResult, idleResult, followupResult] = await Promise.all([
		contactQuery,
		idleIds.length
			? dealQuery().in("id", idleIds)
			: Promise.resolve({ data: [], error: null, count: 0 }),
		missingIds.length
			? dealQuery().in("contact_id", missingIds)
			: Promise.resolve({ data: [], error: null, count: 0 }),
	]);
	if (contactResult.error || idleResult.error || followupResult.error)
		throw new Error(
			"Não foi possível carregar o contexto dos próximos passos.",
		);
	const contacts = (contactResult.data || []).map((contact) => ({
		id: contact.id,
		name: contact.name,
		company: contact.company,
		source: contact.source,
		open_task_id: contact.pending[0]?.id || null,
	}));
	const deals: FollowupDeal[] = [
		...(idleResult.data || []),
		...(followupResult.data || []),
	].flatMap((deal) =>
		deal.contacts
			? [
					{
						id: deal.id,
						title: deal.title,
						stage: deal.stage,
						value: Number(deal.value),
						last_activity_at: deal.last_activity_at,
						contact_id: deal.contact_id,
						open_task_id: deal.pending[0]?.id || null,
						contact: {
							id: deal.contacts.id,
							name: deal.contacts.name,
							company: deal.contacts.company,
							source: deal.contacts.source,
							open_task_id: deal.contacts.pending[0]?.id || null,
						},
					},
				]
			: [],
	);
	const tasks = (taskResult.data || []).map((task) => ({
		id: task.id,
		title: task.title,
		priority: task.priority,
		due_at: task.due_at,
		assignee_user_id: task.assignee_user_id,
		contact_id: task.contact_id,
		deal_id: task.deal_id,
		contact_name: task.contacts?.name || null,
		company: task.contacts?.company || null,
		deal_title: task.deals?.title || null,
	}));
	return (
		<TodayBoard
			key={workspace.id}
			tasks={tasks}
			suggestions={buildFollowupSuggestions(
				contacts,
				deals,
				idleIds,
				missingIds,
				asOf,
			)}
			userId={user.id}
			canEdit={workspace.role !== "viewer"}
			timezone={workspace.timezone}
			name={workspace.name}
			asOf={asOf}
			day={bounds.day}
			stats={{
				open: taskResult.count || 0,
				overdue: overview.stats.overdue,
				missing: overview.stats.no_followup,
				idle: overview.stats.idle,
				todayOpen: todayOpen.count || 0,
				todayDone: todayDone.count || 0,
			}}
			partial={
				!!(
					followupResult.count &&
					followupResult.count > (followupResult.data?.length || 0)
				)
			}
			notice={
				params.message === "created"
					? "Follow-up planejado. A tarefa já está na sua rotina e no histórico do contato."
					: params.message === "done"
						? "Tarefa concluída. Seu acompanhamento foi atualizado."
						: ""
			}
			error={typeof params.error === "string" ? params.error.slice(0, 220) : ""}
		/>
	);
}
