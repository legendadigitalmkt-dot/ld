"use client";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/ui/icons";
import { RefreshResults } from "@/components/app/dashboard-interactions";
import { SubmitButton } from "@/components/app/submit-button";
import {
	dateTime,
	money,
	priorityLabels,
	stageLabels,
} from "@/lib/operational";
import {
	selectTodayTasks,
	taskIsOverdue,
	type TodayTask,
	type TaskView,
	type FollowupSuggestion,
} from "@/lib/today-view";
import { createTask, setTaskStatus } from "../tasks/actions";
import app from "@/components/app/app.module.css";
import styles from "./today.module.css";

export function TodayBoard({
	tasks,
	suggestions,
	userId,
	canEdit,
	timezone,
	name,
	asOf,
	day,
	stats,
	partial,
	notice,
	error,
}: {
	tasks: TodayTask[];
	suggestions: FollowupSuggestion[];
	userId: string;
	canEdit: boolean;
	timezone: string;
	name: string;
	asOf: string;
	day: string;
	stats: {
		open: number;
		overdue: number;
		missing: number;
		idle: number;
		todayOpen: number;
		todayDone: number;
	};
	partial: boolean;
	notice: string;
	error: string;
}) {
	const [view, setView] = useState<TaskView>("all");
	const [owner, setOwner] = useState("all");
	const [query, setQuery] = useState("");
	const [limit, setLimit] = useState(8);
	const filtered = selectTodayTasks(tasks, {
		view,
		owner,
		query,
		userId,
		asOf,
		timezone,
	});
	const dailyTotal = stats.todayOpen + stats.todayDone;
	const date = new Intl.DateTimeFormat("pt-BR", {
		timeZone: timezone,
		weekday: "long",
		day: "numeric",
		month: "long",
	}).format(new Date(asOf));
	function choose(next: TaskView) {
		setView(next);
		setLimit(8);
	}
	return (
		<>
			<div className={app.pageHeader}>
				<div>
					<span className={app.eyebrow}>HOJE · {name}</span>
					<h1>Seu dia, com direção.</h1>
					<p>Saiba quem acompanhar, qual tarefa concluir e onde avançar.</p>
				</div>
				<div className={app.headerActions}>
					<RefreshResults />
					{canEdit ? (
						<Link className="button" href="/app/tasks">
							<Icon name="plus" />
							&nbsp;Nova tarefa
						</Link>
					) : (
						<Link className="button secondary" href="/app/tasks">
							Ver tarefas
						</Link>
					)}
				</div>
			</div>
			{notice ? (
				<p className={app.successNotice} role="status">
					<Icon name="check" />
					{notice}
				</p>
			) : null}
			{error ? (
				<p className="error" role="alert">
					{error}
				</p>
			) : null}
			<section className={styles.focus} aria-label="Foco do dia">
				<div className={styles.focusMessage}>
					<span className={styles.date}>
						<Icon name="clock" />
						{date}
					</span>
					<h2>
						{stats.overdue
							? "Retome os prazos que venceram."
							: stats.todayOpen
								? "Dê sequência ao que está planejado."
								: stats.missing
									? "Transforme seus leads em próximos passos."
									: "Escolha o próximo avanço da operação."}
					</h2>
					<p>
						{stats.overdue
							? "Comece pelas tarefas atrasadas e depois avance nos acompanhamentos de hoje."
							: stats.todayOpen
								? "Sua fila reúne os prazos de hoje e o contexto de cada contato."
								: stats.missing
									? "Há leads aguardando uma ação definida. Planeje o acompanhamento abaixo."
									: "Confira a agenda, os contatos e as oportunidades antes de planejar novas ações."}
					</p>
				</div>
				<div className={styles.progress}>
					<span>Prazos de hoje · workspace</span>
					<strong>
						{stats.todayDone}
						<small> / {dailyTotal}</small>
					</strong>
					<progress
						value={stats.todayDone}
						max={Math.max(dailyTotal, 1)}
						aria-label="Tarefas com prazo hoje concluídas"
					/>
					<small>
						{dailyTotal
							? `${stats.todayDone} concluídas de ${dailyTotal} com prazo hoje`
							: "Nenhuma tarefa com prazo hoje"}
					</small>
				</div>
			</section>
			<section className={styles.stats} aria-label="Resumo do workspace">
				<button type="button" onClick={() => choose("all")}>
					<Icon name="tasks" />
					<span>Em aberto</span>
					<strong>{stats.open}</strong>
					<small>Tarefas do workspace</small>
				</button>
				<button type="button" onClick={() => choose("today")}>
					<Icon name="clock" />
					<span>Vencem hoje</span>
					<strong>{stats.todayOpen}</strong>
					<small>Inclui prazos de hoje vencidos</small>
				</button>
				<button
					type="button"
					onClick={() => choose("overdue")}
					data-alert={stats.overdue > 0}
				>
					<Icon name="bell" />
					<span>Atrasadas</span>
					<strong>{stats.overdue}</strong>
					<small>Retome o acompanhamento</small>
				</button>
				<a href="#today-followups">
					<Icon name="contacts" />
					<span>Sem próxima tarefa</span>
					<strong>{stats.missing}</strong>
					<small>Leads para planejar</small>
				</a>
			</section>
			<div className={styles.columns}>
				<section className={styles.queue} aria-labelledby="today-queue-heading">
					<div className={styles.sectionHeader}>
						<div>
							<span className={app.eyebrow}>EXECUÇÃO</span>
							<h2 id="today-queue-heading">Sua fila de tarefas</h2>
							<p>Prazos vencidos primeiro; depois, hoje e prioridade.</p>
						</div>
						<Link href="/app/tasks">
							Todas as tarefas <Icon name="arrow" />
						</Link>
					</div>
					<div className={styles.filters}>
						<label htmlFor="today-search" className={styles.search}>
							<Icon name="search" />
							<span className={styles.srOnly}>Buscar tarefas e contatos</span>
							<input
								id="today-search"
								type="search"
								value={query}
								placeholder="Tarefa, contato ou empresa..."
								maxLength={100}
								onChange={(event) => {
									setQuery(event.target.value);
									setLimit(8);
								}}
							/>
						</label>
						<label htmlFor="today-owner">
							<span className={styles.srOnly}>Responsável pelas tarefas</span>
							<select
								id="today-owner"
								value={owner}
								onChange={(event) => {
									setOwner(event.target.value);
									setLimit(8);
								}}
							>
								<option value="all">Todos os responsáveis</option>
								<option value="mine">Minhas tarefas</option>
								<option value="unassigned">Sem responsável</option>
							</select>
						</label>
					</div>
					<fieldset
						className={styles.tabs}
						aria-label="Filtrar a fila de tarefas"
					>
						<legend className={styles.srOnly}>Prazo das tarefas</legend>
						{(
							[
								["all", "Em aberto"],
								["today", "Hoje"],
								["overdue", "Atrasadas"],
								["undated", "Sem prazo"],
								["upcoming", "Próximas"],
							] as const
						).map(([id, label]) => (
							<button
								key={id}
								type="button"
								aria-pressed={view === id}
								onClick={() => choose(id)}
							>
								{label}
							</button>
						))}
					</fieldset>
					<p className={styles.result} aria-live="polite">
						{filtered.length} tarefas nesta seleção
						{tasks.length < stats.open
							? ` · ${tasks.length} de ${stats.open} carregadas`
							: ""}
					</p>
					{tasks.length < stats.open ? (
						<p className={app.notice}>
							A fila carrega até 1.000 tarefas por prazo. A busca e os filtros
							atuam nesse conjunto. Consulte todas na página de tarefas.
						</p>
					) : null}
					{filtered.length ? (
						<ul className={styles.taskList}>
							{filtered.slice(0, limit).map((task) => {
								const overdue = taskIsOverdue(task, asOf);
								return (
									<li
										key={task.id}
										className={styles.task}
										data-overdue={overdue}
									>
										<span className={styles.taskMarker}>
											<Icon name={overdue ? "clock" : "tasks"} />
										</span>
										<div className={styles.taskContent}>
											<div className={styles.taskHeading}>
												<h3>{task.title}</h3>
												<span
													className={styles.badge}
													data-high={task.priority === "high"}
												>
													{priorityLabels[task.priority]}
												</span>
											</div>
											<div className={styles.taskContext}>
												{task.contact_id && task.contact_name ? (
													<Link href={`/app/contacts/${task.contact_id}`}>
														{task.contact_name}
														{task.company ? ` · ${task.company}` : ""}
													</Link>
												) : null}
												{task.deal_id ? (
													<Link href={`/app/pipeline?deal=${task.deal_id}`}>
														{task.deal_title || "Ver oportunidade"}
													</Link>
												) : null}
											</div>
											<div className={styles.taskMeta}>
												<span data-overdue={overdue}>
													<Icon name="clock" />
													{dateTime(task.due_at, timezone)}
													{overdue ? " · atrasada" : ""}
												</span>
												<span>
													<Icon name="team" />
													{!task.assignee_user_id
														? "Sem responsável"
														: task.assignee_user_id === userId
															? "Você"
															: "Outro membro da equipe"}
												</span>
											</div>
										</div>
										{canEdit ? (
											<form
												action={setTaskStatus}
												aria-label={`Concluir tarefa ${task.title}`}
											>
												<input type="hidden" name="taskId" value={task.id} />
												<input type="hidden" name="status" value="done" />
												<input type="hidden" name="returnTo" value="today" />
												<SubmitButton>
													<Icon name="check" />
													Concluir
												</SubmitButton>
											</form>
										) : null}
									</li>
								);
							})}
						</ul>
					) : (
						<div className={styles.empty}>
							<Icon name="tasks" />
							<h3>
								{tasks.length
									? "Nenhuma tarefa com esses filtros."
									: "Sua próxima ação começa aqui."}
							</h3>
							<p>
								{tasks.length
									? "Ajuste a busca, o prazo ou o responsável para consultar a fila."
									: "Planeje um follow-up nos contatos ao lado ou crie uma tarefa para a operação."}
							</p>
							{tasks.length ? (
								<button
									type="button"
									onClick={() => {
										choose("all");
										setOwner("all");
										setQuery("");
									}}
								>
									Limpar filtros
								</button>
							) : (
								<a href="#today-followups">
									Examinar próximos passos <Icon name="arrow" />
								</a>
							)}
						</div>
					)}
					{filtered.length > limit ? (
						<button
							className={styles.more}
							type="button"
							onClick={() => setLimit((value) => value + 8)}
						>
							Mostrar mais tarefas ({filtered.length - limit})
						</button>
					) : null}
					{!canEdit ? (
						<p className={styles.result}>
							Acesso de leitura. Sua equipe pode criar e concluir tarefas.
						</p>
					) : null}
				</section>
				<aside
					className={styles.followups}
					id="today-followups"
					aria-labelledby="today-followups-heading"
				>
					<div className={styles.sectionHeader}>
						<div>
							<span className={app.eyebrow}>RELACIONAMENTO</span>
							<h2 id="today-followups-heading">Quem contatar</h2>
							<p>Sugestões pela etapa e pelo acompanhamento.</p>
						</div>
						<Icon name="target" />
					</div>
					<p className={styles.rules}>
						{stats.idle} oportunidades sem atividade há 24h+. Comece pelos
						negócios parados e defina a próxima tarefa.
					</p>
					{suggestions.length ? (
						<ol className={styles.suggestionList}>
							{suggestions.map((item, index) => (
								<li key={item.contact.id} className={styles.suggestion}>
									<div className={styles.suggestionTop}>
										<span className={styles.number}>
											{String(index + 1).padStart(2, "0")}
										</span>
										<span
											className={styles.badge}
											data-high={item.kind === "idle"}
										>
											{item.kind === "idle"
												? "24h+ sem atividade"
												: "Sem próxima tarefa"}
										</span>
									</div>
									<Link
										className={styles.contact}
										href={`/app/contacts/${item.contact.id}`}
									>
										{item.contact.name}
										<Icon name="arrow" />
									</Link>
									<p className={styles.source}>
										{[item.contact.company, item.contact.source]
											.filter(Boolean)
											.join(" · ")}
									</p>
									<h3>{item.task_title}</h3>
									{item.deal ? (
										<Link
											className={styles.deal}
											href={`/app/pipeline?deal=${item.deal.id}`}
										>
											{stageLabels[item.deal.stage]} · {money(item.deal.value)}
											<Icon name="pipeline" />
										</Link>
									) : (
										<span className={styles.source}>
											Contato aguardando próximo passo
										</span>
									)}
									{item.task_id ? (
										<Link
											className={styles.existingTask}
											href={`/app/tasks?task=${item.task_id}&status=open`}
										>
											Ver acompanhamento planejado <Icon name="arrow" />
										</Link>
									) : canEdit ? (
										<details className={styles.planner}>
											<summary>
												Planejar follow-up <Icon name="plus" />
											</summary>
											<form action={createTask}>
												<input
													type="hidden"
													name="contactId"
													value={item.contact.id}
												/>
												<input
													type="hidden"
													name="dealId"
													value={item.deal?.id || ""}
												/>
												<input type="hidden" name="returnTo" value="today" />
												<label htmlFor={`plan-title-${item.contact.id}`}>
													Próxima ação
												</label>
												<input
													id={`plan-title-${item.contact.id}`}
													name="title"
													required
													minLength={2}
													maxLength={180}
													defaultValue={item.task_title}
												/>
												<div className={styles.plannerFields}>
													<div>
														<label htmlFor={`plan-priority-${item.contact.id}`}>
															Prioridade
														</label>
														<select
															id={`plan-priority-${item.contact.id}`}
															name="priority"
															defaultValue={item.priority}
														>
															<option value="low">Baixa</option>
															<option value="medium">Média</option>
															<option value="high">Alta</option>
														</select>
													</div>
													<div>
														<label htmlFor={`plan-date-${item.contact.id}`}>
															Prazo
														</label>
														<input
															id={`plan-date-${item.contact.id}`}
															type="date"
															name="dueDate"
															defaultValue={day}
														/>
													</div>
												</div>
												<small>
													Responsável: você. O prazo usa o fuso do workspace.
												</small>
												<SubmitButton primary>Salvar follow-up</SubmitButton>
											</form>
										</details>
									) : null}
								</li>
							))}
						</ol>
					) : (
						<div className={styles.empty}>
							<Icon name="check" />
							<h3>Nenhum próximo passo nesta seleção.</h3>
							<p>Confira seus contatos ou o funil para revisar a operação.</p>
						</div>
					)}
					<p className={styles.result}>
						Seleção dos 5 leads sem tarefa mais antigos e das 5 oportunidades
						paradas há mais tempo. Um contato aparece uma vez; confira o
						histórico antes de agir.
						{partial
							? " O contexto considera até 1.000 oportunidades dos leads selecionados."
							: ""}
					</p>
					<div className={styles.footerLinks}>
						<Link href="/app/contacts?status=lead">
							Abrir CRM <Icon name="arrow" />
						</Link>
						<Link href="/app/pipeline?idle=1">
							Revisar funil <Icon name="arrow" />
						</Link>
					</div>
				</aside>
			</div>
			<p className={styles.updated}>
				Atualizado em {dateTime(asOf, timezone)} · {timezone}. Use Atualizar
				para renovar sua fila.
			</p>
		</>
	);
}
