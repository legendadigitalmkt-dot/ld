import assert from "node:assert/strict";
import test from "node:test";
import {
	buildFollowupSuggestions,
	selectTodayTasks,
	taskIsOverdue,
	workspaceDayBounds,
	type TodayTask,
	type FollowupDeal,
	type FollowupContact,
} from "../lib/today-view.ts";
import { taskReturnPath } from "../lib/task-input.ts";

const asOf = "2026-10-10T15:00:00Z";
const timezone = "America/Sao_Paulo";
const base: TodayTask = {
	id: "t1",
	title: "Enviar proposta",
	priority: "medium",
	due_at: null,
	assignee_user_id: "me",
	contact_id: "c1",
	deal_id: "d1",
	contact_name: "João",
	company: "Ação",
	deal_title: "Plano anual",
};
const options = {
	view: "all" as const,
	owner: "all",
	query: "",
	userId: "me",
	asOf,
	timezone,
};
const contact: FollowupContact = {
	id: "c1",
	name: "João",
	company: null,
	source: "Manual",
	open_task_id: null,
};
const deal: FollowupDeal = {
	id: "d1",
	title: "Proposta",
	stage: "proposal",
	value: 1500,
	last_activity_at: "2026-10-09T15:00:00Z",
	contact_id: contact.id,
	contact,
	open_task_id: null,
};

test("today uses the workspace date across the UTC midnight boundary", () => {
	assert.deepEqual(workspaceDayBounds("2026-10-10T01:00:00Z", timezone), {
		day: "2026-10-09",
		start: "2026-10-09T03:00:00.000Z",
		end: "2026-10-10T03:00:00.000Z",
	});
	const tasks = [
		{ ...base, id: "inside", due_at: "2026-10-10T02:59:59Z" },
		{ ...base, id: "next-day", due_at: "2026-10-10T03:00:00Z" },
	];
	assert.deepEqual(
		selectTodayTasks(tasks, {
			...options,
			asOf: "2026-10-10T01:00:00Z",
			view: "today",
		}).map((t) => t.id),
		["inside"],
	);
});
test("day bounds respect 23-hour and 25-hour daylight saving days", () => {
	const spring = workspaceDayBounds("2026-03-08T16:00:00Z", "America/New_York");
	const fall = workspaceDayBounds("2026-11-01T16:00:00Z", "America/New_York");
	assert.equal(
		(Date.parse(spring.end) - Date.parse(spring.start)) / 3_600_000,
		23,
	);
	assert.equal((Date.parse(fall.end) - Date.parse(fall.start)) / 3_600_000, 25);
});
test("overdue requires a deadline strictly before now", () => {
	assert.equal(taskIsOverdue({ ...base, due_at: asOf }, asOf), false);
	assert.equal(
		taskIsOverdue({ ...base, due_at: "2026-10-10T14:59:59Z" }, asOf),
		true,
	);
	assert.equal(taskIsOverdue(base, asOf), false);
});
test("queue ranks overdue ahead of today and then priority, with stable undated ordering", () => {
	const tasks = [
		{ ...base, id: "undated-high", priority: "high" },
		{ ...base, id: "today", due_at: "2026-10-11T02:59:59Z", priority: "low" },
		{ ...base, id: "late", due_at: "2026-10-09T02:59:59Z" },
		{ ...base, id: "undated-low", priority: "low" },
		{ ...base, id: "undated-medium", priority: "medium" },
	];
	assert.deepEqual(
		selectTodayTasks(tasks, options).map((t) => t.id),
		["late", "today", "undated-high", "undated-medium", "undated-low"],
	);
});
test("queue combines owner, deadline and accent-insensitive contextual search", () => {
	const tasks = [
		base,
		{ ...base, id: "other", assignee_user_id: "other" },
		{ ...base, id: "unassigned", assignee_user_id: null },
		{ ...base, id: "tomorrow", due_at: "2026-10-12T02:00:00Z" },
	];
	assert.deepEqual(
		selectTodayTasks(tasks, {
			...options,
			owner: "mine",
			view: "undated",
			query: "acao",
		}).map((t) => t.id),
		["t1"],
	);
	assert.deepEqual(
		selectTodayTasks(tasks, {
			...options,
			owner: "unassigned",
			query: "joao",
		}).map((t) => t.id),
		["unassigned"],
	);
	assert.deepEqual(
		selectTodayTasks(tasks, {
			...options,
			view: "upcoming",
			query: "plano",
		}).map((t) => t.id),
		["tomorrow"],
	);
	assert.deepEqual(selectTodayTasks([], { ...options, view: "today" }), []);
});
test("followup merges contact/deal candidates and excludes closed deals", () => {
	const items = buildFollowupSuggestions(
		[contact],
		[
			deal,
			{ ...deal, id: "won", stage: "won", value: 9000 },
			{ ...deal, id: "lost", stage: "lost" },
		],
		["d1", "won", "lost"],
		["c1"],
		asOf,
	);
	assert.equal(items.length, 1);
	assert.equal(items[0].kind, "idle");
	assert.equal(items[0].task_title, "Retomar proposta com João");
	assert.equal(items[0].priority, "high");
});
test("existing open followup links to its task and prevents another planning suggestion", () => {
	const scheduled = { ...contact, open_task_id: "existing" };
	assert.deepEqual(
		buildFollowupSuggestions(
			[scheduled],
			[{ ...deal, contact: scheduled }],
			[],
			[contact.id],
			asOf,
		),
		[],
	);
	const idle = buildFollowupSuggestions(
		[scheduled],
		[{ ...deal, contact: scheduled }],
		[deal.id],
		[contact.id],
		asOf,
	);
	assert.equal(idle[0].task_id, "existing");
	const dealTask = buildFollowupSuggestions(
		[contact],
		[{ ...deal, open_task_id: "deal-task" }],
		[deal.id],
		[],
		asOf,
	);
	assert.equal(dealTask[0].task_id, "deal-task");
});
test("followup picks the advanced stage per contact and handles contacts without deals", () => {
	const items = buildFollowupSuggestions(
		[contact],
		[{ ...deal, id: "new", stage: "new", value: 5000 }, deal],
		[],
		[contact.id],
		asOf,
	);
	assert.equal(items[0].deal?.id, deal.id);
	const long = { ...contact, name: "A".repeat(160) };
	const fallback = buildFollowupSuggestions([long], [], [], [contact.id], asOf);
	assert.equal(fallback[0].deal, null);
	assert.equal(fallback[0].task_title.length, 180);
});
test("task return routes are allowlisted and reject external destinations", () => {
	const data = new FormData();
	assert.equal(taskReturnPath(data), "/app/tasks");
	data.set("returnTo", "today");
	assert.equal(taskReturnPath(data), "/app/today");
	for (const input of [
		"https://example.com",
		"//example.com",
		"/app/today",
		"today?next=external",
	]) {
		data.set("returnTo", input);
		assert.equal(taskReturnPath(data), "/app/tasks");
	}
});
