import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/lib/workspace";
import { uuidPattern } from "@/lib/workspace-selection";
import { dateTime, priorityLabels } from "@/lib/operational";
import { SubmitButton } from "@/components/app/submit-button";
import { createTask, setTaskStatus } from "./actions";
import styles from "@/components/app/app.module.css";

export default async function TasksPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const workspace = await requireWorkspace();
	const params = await searchParams;
	const view =
		typeof params.status === "string" &&
		["open", "done", "overdue", "all"].includes(params.status)
			? params.status
			: "open";
	const page = Math.max(
		1,
		Math.min(10000, Math.trunc(Number(params.page)) || 1),
	);
	const supabase = await createClient();
	let query = supabase
		.from("tasks")
		.select("id,title,status,priority,due_at,contact_id,deal_id", {
			count: "exact",
		})
		.eq("workspace_id", workspace.id);
	if (view === "open" || view === "done") query = query.eq("status", view);
	if (view === "overdue")
		query = query.eq("status", "open").lt("due_at", new Date().toISOString());
	const focusedTask =
		typeof params.task === "string" && uuidPattern.test(params.task)
			? params.task
			: "";
	if (focusedTask) query = query.eq("id", focusedTask);
	const {
		data: tasks,
		error,
		count,
	} = await query
		.order("due_at", { ascending: true, nullsFirst: false })
		.order("id")
		.range((page - 1) * 50, page * 50 - 1);
	if (error) throw new Error("Não foi possível carregar suas tarefas.");
	const requestedContact =
		typeof params.contact === "string" ? params.contact : "";
	const requestedDeal = typeof params.deal === "string" ? params.deal : "";
	const [contactResult, dealResult] = await Promise.all([
		uuidPattern.test(requestedContact)
			? supabase
					.from("contacts")
					.select("id,name")
					.eq("workspace_id", workspace.id)
					.eq("id", requestedContact)
					.maybeSingle()
			: Promise.resolve({ data: null }),
		uuidPattern.test(requestedDeal)
			? supabase
					.from("deals")
					.select("id,title,contact_id")
					.eq("workspace_id", workspace.id)
					.eq("id", requestedDeal)
					.maybeSingle()
			: Promise.resolve({ data: null }),
	]);
	const contact = contactResult.data;
	const deal = dealResult.data;
	const unavailable =
		(requestedContact && !contact) ||
		(requestedDeal && !deal) ||
		(contact && deal && deal.contact_id !== contact.id);
	const canEdit = workspace.role !== "viewer";
	const notice =
		params.message === "created"
			? "Tarefa criada. O dashboard e o histórico foram atualizados."
			: params.message === "done"
				? "Tarefa concluída."
				: params.message === "open"
					? "Tarefa reaberta."
					: "";
	const now = Date.now();
	const total = count || 0;
	const taskUrl = (next: number) => `/app/tasks?status=${view}&page=${next}`;
	return (
		<>
			<div className={styles.pageHeader}>
				<div>
					<span className={styles.eyebrow}>EXECUÇÃO</span>
					<h1>O próximo passo, definido.</h1>
					<p>Crie uma tarefa, estabeleça o prazo e acompanhe a execução.</p>
				</div>
			</div>
			{notice ? (
				<p role="status" className={styles.notice}>
					{notice}
				</p>
			) : null}
			{typeof params.error === "string" ? (
				<p role="alert" className="error">
					{params.error.slice(0, 220)}
				</p>
			) : null}
			{canEdit ? (
				<section className={styles.panel}>
					<div className={styles.panelHeader}>
						<div>
							<h2>
								{contact || deal
									? "Nova tarefa de acompanhamento"
									: "Nova tarefa"}
							</h2>
							<p>
								{deal
									? `Oportunidade: ${deal.title}`
									: contact
										? `Contato: ${contact.name}`
										: `Prazo até o fim do dia no fuso ${workspace.timezone}.`}
							</p>
						</div>
						{contact || deal || unavailable ? (
							<Link href="/app/tasks">Limpar vínculo →</Link>
						) : null}
					</div>
					{unavailable ? (
						<p className="error" role="alert">
							O vínculo solicitado não está disponível neste workspace. Limpe o
							vínculo para criar outra tarefa.
						</p>
					) : (
						<form action={createTask} className={styles.taskForm}>
							<input
								type="hidden"
								name="contactId"
								value={contact?.id || deal?.contact_id || ""}
							/>
							<input type="hidden" name="dealId" value={deal?.id || ""} />
							<label>
								Tarefa
								<input
									name="title"
									required
									minLength={2}
									maxLength={180}
									placeholder="Ex.: Retomar proposta com o cliente"
								/>
							</label>
							<label>
								Prioridade
								<select name="priority" defaultValue="medium">
									<option value="low">Baixa</option>
									<option value="medium">Média</option>
									<option value="high">Alta</option>
								</select>
							</label>
							<label>
								Prazo
								<input type="date" name="dueDate" />
							</label>
							<SubmitButton primary>Criar tarefa</SubmitButton>
						</form>
					)}
				</section>
			) : (
				<p className={styles.notice}>
					Sua conta possui acesso de leitura. A equipe responsável pode criar e
					atualizar tarefas.
				</p>
			)}
			<nav aria-label="Filtrar tarefas" className={styles.taskTabs}>
				{[
					["open", "Abertas"],
					["overdue", "Atrasadas"],
					["done", "Concluídas"],
					["all", "Todas"],
				].map(([value, label]) => (
					<Link
						key={value}
						href={`/app/tasks?status=${value}`}
						aria-current={view === value ? "page" : undefined}
					>
						{label}
					</Link>
				))}
			</nav>
			{focusedTask ? (
				<p className={styles.notice}>
					Consulta da tarefa selecionada.{" "}
					<Link href="/app/tasks?status=all">Mostrar todas →</Link>
				</p>
			) : null}
			<p className={styles.resultCount}>
				{total} tarefas nesta seleção · página {page} de{" "}
				{Math.max(1, Math.ceil(total / 50))}
			</p>
			{tasks?.length ? (
				<section className="card table-wrap">
					<table>
						<thead>
							<tr>
								<th>Tarefa</th>
								<th>Prioridade</th>
								<th>Prazo</th>
								<th>Status</th>
								{canEdit ? <th>Ação</th> : null}
							</tr>
						</thead>
						<tbody>
							{tasks.map((task) => {
								const overdue =
									task.status === "open" &&
									task.due_at &&
									Date.parse(task.due_at) < now;
								return (
									<tr
										key={task.id}
										id={`task-${task.id}`}
										className={styles.taskRow}
									>
										<td>
											<strong
												className={
													task.status === "done" ? styles.taskDone : undefined
												}
											>
												{task.title}
											</strong>
											{task.deal_id || task.contact_id ? (
												<small>
													{task.deal_id
														? "Vinculada a uma oportunidade"
														: "Vinculada a um contato"}
												</small>
											) : null}
										</td>
										<td
											className={
												task.priority === "high"
													? styles.priorityHigh
													: undefined
											}
										>
											{priorityLabels[task.priority]}
										</td>
										<td className={overdue ? styles.overdue : undefined}>
											{dateTime(task.due_at, workspace.timezone)}
											{overdue ? <small>Prazo vencido</small> : null}
										</td>
										<td>
											<span className="badge">
												{task.status === "done" ? "Concluída" : "Aberta"}
											</span>
										</td>
										{canEdit ? (
											<td>
												<form action={setTaskStatus}>
													<input type="hidden" name="taskId" value={task.id} />
													<input
														type="hidden"
														name="status"
														value={task.status === "done" ? "open" : "done"}
													/>
													<input
														type="hidden"
														name="returnStatus"
														value={view}
													/>
													<input type="hidden" name="returnPage" value={page} />
													<SubmitButton>
														{task.status === "done" ? "Reabrir" : "Concluir"}
													</SubmitButton>
												</form>
											</td>
										) : null}
									</tr>
								);
							})}
						</tbody>
					</table>
				</section>
			) : (
				<section className={styles.empty}>
					<strong>Nenhuma tarefa nesta seleção.</strong>
					<p>
						{view === "open"
							? "Defina uma próxima ação para acompanhar sua operação."
							: "Experimente outro filtro para consultar as tarefas."}
					</p>
				</section>
			)}
			{total > 50 || page > 1 ? (
				<nav aria-label="Paginação de tarefas" className={styles.pagination}>
					{page > 1 ? (
						<Link href={taskUrl(page - 1)}>← Anterior</Link>
					) : (
						<span />
					)}
					{page * 50 < total ? (
						<Link href={taskUrl(page + 1)}>Próxima →</Link>
					) : (
						<span />
					)}
				</nav>
			) : null}
		</>
	);
}
