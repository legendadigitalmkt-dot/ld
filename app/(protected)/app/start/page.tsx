import Link from "next/link";
import { notFound } from "next/navigation";
import { randomUUID } from "node:crypto";
import { requireWorkspace } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import { uuidPattern } from "@/lib/workspace-selection";
import type { ContactContext } from "@/lib/contact-context";
import { activationProgress } from "@/lib/activation";
import { workspaceDayBounds } from "@/lib/today-view";
import { stageLabels, priorityLabels } from "@/lib/operational";
import { Icon } from "@/components/ui/icons";
import {
	ActivationLeadForm,
	ActivationOpportunityForm,
	ActivationTaskForm,
} from "./start-forms";
import styles from "./start.module.css";

export default async function StartPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const workspace = await requireWorkspace();
	const params = await searchParams;
	const supabase = await createClient();
	const { data: contacts, error } = await supabase
		.from("contacts")
		.select("id,name", { count: "exact" })
		.eq("workspace_id", workspace.id)
		.order("created_at", { ascending: false })
		.order("id")
		.limit(30);
	if (error) throw new Error("Não foi possível carregar os primeiros passos.");
	const contactId =
		typeof params.contact === "string" && uuidPattern.test(params.contact)
			? params.contact
			: "";
	let context: ContactContext | null = null;
	if (contactId) {
		const result = await supabase.rpc("contact_context", {
			p_workspace_id: workspace.id,
			p_contact_id: contactId,
			p_history_page: 1,
		});
		if (result.error)
			throw new Error("Não foi possível carregar esse contato.");
		if (!result.data) notFound();
		context = result.data as unknown as ContactContext;
	}
	const progress = activationProgress(context);
	const deal =
		context?.deals.find((d) => !["won", "lost"].includes(d.stage)) ||
		context?.deals[0];
	const canEdit = workspace.role !== "viewer";
	const day = workspaceDayBounds(
		new Date().toISOString(),
		workspace.timezone,
	).day;
	return (
		<>
			<header className={styles.hero}>
				<div>
					<span className={styles.kicker}>
						PRIMEIROS PASSOS · {workspace.name}
					</span>
					<h1>Seu primeiro avanço no Growth OS.</h1>
					<p>Um contato. Uma oportunidade. Uma próxima ação com prazo.</p>
				</div>
				<Link className="button secondary" href="/app/today">
					Continuar na operação →
				</Link>
			</header>
			<section
				className={styles.journey}
				aria-label="Progresso dos primeiros passos"
			>
				<div className={styles.progressTitle}>
					<strong>
						{progress.ready
							? "Seu fluxo comercial está pronto."
							: "Organize seu primeiro acompanhamento."}
					</strong>
					<span>{progress.completed} de 3 etapas</span>
				</div>
				<progress
					max={3}
					value={progress.completed}
					aria-label="Etapas dos primeiros passos concluídas"
				/>
				<ol>
					{[
						"Contato cadastrado",
						"Oportunidade vinculada",
						"Primeira tarefa planejada",
					].map((label, i) => (
						<li
							key={label}
							aria-current={
								!progress.steps[i] && (i === 0 || progress.steps[i - 1])
									? "step"
									: undefined
							}
						>
							<span className={progress.steps[i] ? styles.done : undefined}>
								{progress.steps[i] ? <Icon name="check" /> : i + 1}
							</span>
							<div>
								<strong>{label}</strong>
								<small>
									{progress.steps[i] ? "Concluída" : "Próximo avanço"}
								</small>
							</div>
						</li>
					))}
				</ol>
				<p>O progresso considera este contato e os registros ligados a ele.</p>
			</section>
			{!canEdit ? (
				<p className={styles.hint}>
					Você tem acesso de leitura. Um membro com permissão de edição pode
					cadastrar os registros.
				</p>
			) : null}
			<div className={styles.layout}>
				<section className={styles.panel}>
					<span className={styles.kicker}>
						{context ? "CONTATO EM FOCO" : "ETAPA 1"}
					</span>
					<h2>
						{context ? context.contact.name : "Comece por uma pessoa real."}
					</h2>
					<p>
						{context
							? "Este é o contato usado para acompanhar as três etapas."
							: "Cadastre seu primeiro lead ou continue com um contato já existente."}
					</p>
					{context ? (
						<>
							<Link
								className={styles.record}
								href={`/app/contacts/${context.contact.id}`}
							>
								<Icon name="contacts" />
								<div>
									<strong>Abrir perfil no CRM</strong>
									<small>
										{context.contact.company || context.contact.source}
									</small>
								</div>
								<Icon name="arrow" />
							</Link>
							<Link className={styles.textLink} href="/app/start">
								Escolher outro contato ou cadastrar novo →
							</Link>
						</>
					) : canEdit ? (
						<ActivationLeadForm intakeKey={randomUUID()} />
					) : (
						<p>Escolha um contato abaixo para consultar o fluxo.</p>
					)}
					{(contacts || []).length ? (
						<details className={styles.choose} open={!context}>
							<summary>Continuar com um contato existente</summary>
							<form method="get" action="/app/start" className="stack">
								<label htmlFor="activation-contact">
									Contato
									<select
										id="activation-contact"
										name="contact"
										defaultValue={context?.contact.id || contacts?.[0]?.id}
									>
										{context &&
										!contacts?.some((c) => c.id === context?.contact.id) ? (
											<option value={context.contact.id}>
												{context.contact.name}
											</option>
										) : null}
										{contacts?.map((c) => (
											<option value={c.id} key={c.id}>
												{c.name}
											</option>
										))}
									</select>
								</label>
								<button className="button secondary" type="submit">
									Usar este contato
								</button>
								<small className={styles.hint}>
									Até 30 contatos recentes.{" "}
									<Link href="/app/contacts">Busque outros no CRM</Link>.
								</small>
							</form>
						</details>
					) : null}
				</section>
				<div className={styles.column}>
					<section className={styles.panel}>
						<span className={styles.kicker}>ETAPA 2</span>
						<h2>Dê forma à oportunidade.</h2>
						<p>
							A oportunidade representa o negócio que você quer desenvolver.
						</p>
						{deal ? (
							<>
								<Link
									className={styles.record}
									href={`/app/pipeline?deal=${deal.id}`}
								>
									<Icon name="pipeline" />
									<div>
										<strong>{deal.title}</strong>
										<small>
											{stageLabels[deal.stage]} ·{" "}
											{new Intl.NumberFormat("pt-BR", {
												style: "currency",
												currency: "BRL",
											}).format(deal.value)}
										</small>
									</div>
									<Icon name="arrow" />
								</Link>
								<p className={styles.hint}>
									Use o funil para revisar a etapa e o valor estimado. Você pode
									continuar sem estimar receita agora.
								</p>
							</>
						) : context && canEdit ? (
							<ActivationOpportunityForm
								contactId={context.contact.id}
								name={context.contact.name}
							/>
						) : (
							<div className={styles.waiting}>
								Escolha ou cadastre o contato para vincular uma oportunidade.
							</div>
						)}
					</section>
					<section className={styles.panel}>
						<span className={styles.kicker}>ETAPA 3</span>
						<h2>Defina uma ação com prazo.</h2>
						<p>Saia do cadastro com um próximo passo que possa executar.</p>
						{context?.stats.tasks ? (
							<>
								<p className={styles.success}>
									<Icon name="check" />
									Uma tarefa já foi planejada para este contato.
								</p>
								{context.tasks.slice(0, 3).map((t) => (
									<Link
										className={styles.record}
										href={`/app/tasks?task=${t.id}&status=${t.status === "done" ? "done" : "open"}`}
										key={t.id}
									>
										<Icon name="tasks" />
										<div>
											<strong>{t.title}</strong>
											<small>
												{t.status === "done" ? "Concluída" : "Em aberto"} ·{" "}
												{priorityLabels[t.priority]}
											</small>
										</div>
									</Link>
								))}
								<Link className="button" href="/app/today">
									Abrir minha rotina →
								</Link>
							</>
						) : context && deal && canEdit ? (
							<ActivationTaskForm
								contactId={context.contact.id}
								dealId={deal.id}
								name={context.contact.name}
								day={day}
								timezone={workspace.timezone}
							/>
						) : (
							<div className={styles.waiting}>
								A tarefa ficará ligada ao contato e à oportunidade das etapas
								anteriores.
							</div>
						)}
					</section>
				</div>
			</div>
			{progress.ready ? (
				<section className={styles.ready} role="status">
					<Icon name="check" />
					<div>
						<h2>Seu acompanhamento tem direção.</h2>
						<p>
							Continue em Hoje ou consulte o Growth AI no perfil do contato para
							revisar o próximo passo.
						</p>
					</div>
					<Link
						className="button secondary"
						href={`/app/contacts/${context?.contact.id}#growth-ai`}
					>
						Revisar com Growth AI →
					</Link>
				</section>
			) : null}
		</>
	);
}
