"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import { readTaskInput, taskReturnPath } from "@/lib/task-input";
import { uuidPattern } from "@/lib/workspace-selection";

function fail(
	message: string,
	path: "/app/tasks" | "/app/today" = "/app/tasks",
): never {
	redirect(`${path}?error=${encodeURIComponent(message)}`);
}
export async function createTask(formData: FormData) {
	const returnPath = taskReturnPath(formData);
	const workspace = await requireWorkspace();
	if (workspace.role === "viewer")
		fail("Sua conta permite apenas visualizar tarefas.", returnPath);
	let input: ReturnType<typeof readTaskInput>;
	try {
		input = readTaskInput(formData, workspace.timezone);
	} catch (error) {
		fail(
			error instanceof Error ? error.message : "Confira os dados da tarefa.",
			returnPath,
		);
	}
	const contactId = String(formData.get("contactId") || "");
	const dealId = String(formData.get("dealId") || "");
	if (
		(contactId && !uuidPattern.test(contactId)) ||
		(dealId && !uuidPattern.test(dealId))
	)
		fail("O vínculo da tarefa não é válido.", returnPath);
	const supabase = await createClient();
	const { data, error } = await supabase.rpc("create_workspace_task", {
		p_workspace_id: workspace.id,
		p_title: input.title,
		p_priority: input.priority,
		p_due_at: input.due_at,
		p_contact_id: contactId || null,
		p_deal_id: dealId || null,
	});
	if (error || !data)
		fail(
			"Não foi possível criar a tarefa. Confira o vínculo e sua permissão no workspace.",
			returnPath,
		);
	revalidatePath("/app", "layout");
	redirect(`${returnPath}?message=created`);
}
export async function setTaskStatus(formData: FormData) {
	const returnPath = taskReturnPath(formData);
	const workspace = await requireWorkspace();
	if (workspace.role === "viewer")
		fail("Sua conta permite apenas visualizar tarefas.", returnPath);
	const taskId = String(formData.get("taskId") || "");
	const status = String(formData.get("status") || "");
	if (!uuidPattern.test(taskId) || (status !== "open" && status !== "done"))
		fail("A alteração solicitada não é válida.", returnPath);
	const supabase = await createClient();
	const { error } = await supabase.rpc("set_workspace_task_status", {
		p_workspace_id: workspace.id,
		p_task_id: taskId,
		p_status: status,
	});
	if (error)
		fail(
			"Não foi possível atualizar essa tarefa no workspace atual.",
			returnPath,
		);
	revalidatePath("/app", "layout");
	if (returnPath === "/app/today") redirect(`/app/today?message=${status}`);
	const requested = String(formData.get("returnStatus") || "");
	const view = ["open", "done", "overdue", "all"].includes(requested)
		? requested
		: "open";
	const page = Math.max(
		1,
		Math.min(10000, Number(formData.get("returnPage")) || 1),
	);
	redirect(
		`/app/tasks?status=${view}&page=${Math.trunc(page)}&message=${status}`,
	);
}
