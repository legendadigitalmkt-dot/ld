"use client";

import Link from "next/link";
import {
	useEffect,
	useMemo,
	useRef,
	useState,
	useTransition,
	type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icons";
import { dateTime, money } from "@/lib/operational";
import {
	filterPipeline,
	isIdleDeal,
	isOpenDeal,
	parseDealValue,
	pipelineStages,
	pipelineSummary,
	type PipelineDeal,
	type PipelineStage,
} from "@/lib/pipeline-view";
import { moveDealStageAction, updateDealValueAction } from "./actions";
import styles from "./pipeline.module.css";
import appStyles from "@/components/app/app.module.css";

export type { PipelineDeal } from "@/lib/pipeline-view";

export function PipelineKanban({
	initialDeals,
	canEdit,
	timezone,
	asOf,
	initialStage = "open",
	initialIdle = false,
	initialView = "kanban",
}: {
	initialDeals: PipelineDeal[];
	canEdit: boolean;
	timezone: string;
	asOf: string;
	initialStage?: string;
	initialIdle?: boolean;
	initialView?: string;
}) {
	const router = useRouter();
	const [deals, setDeals] = useState(initialDeals);
	const [query, setQuery] = useState("");
	const [stageFilter, setStageFilter] = useState(initialStage);
	const [idle, setIdle] = useState(initialIdle);
	const [sort, setSort] = useState("recent");
	const [view, setView] = useState(initialView);
	const [dragged, setDragged] = useState<string | null>(null);
	const [dropStage, setDropStage] = useState<string | null>(null);
	const [editing, setEditing] = useState<string | null>(null);
	const [error, setError] = useState("");
	const [notice, setNotice] = useState("");
	const [pending, startTransition] = useTransition();
	const locked = useRef(false);
	const board = useRef<HTMLElement>(null);
	const [compact, setCompact] = useState(false);
	const [activeColumn, setActiveColumn] = useState("new");
	useEffect(() => {
		const media = window.matchMedia("(pointer: coarse), (max-width: 680px)");
		const update = () => setCompact(media.matches);
		update();
		media.addEventListener("change", update);
		return () => media.removeEventListener("change", update);
	}, []);
	useEffect(() => {
		setDeals(initialDeals);
	}, [initialDeals]);
	const visible = useMemo(
		() =>
			filterPipeline(deals, { query, stage: stageFilter, idle, sort }, asOf),
		[deals, query, stageFilter, idle, sort, asOf],
	);
	const summary = pipelineSummary(deals, asOf);
	const shownSummary = pipelineSummary(visible, asOf);
	const stageSet =
		stageFilter === "open"
			? pipelineStages.filter(
					(stage) => stage.id !== "won" && stage.id !== "lost",
				)
			: stageFilter === "all"
				? pipelineStages
				: pipelineStages.filter((stage) => stage.id === stageFilter);
	const openVisible = visible.filter(isOpenDeal);
	const filtered = query.trim() !== "" || idle || stageFilter !== "open";
	function goToColumn(id: string) {
		const element = board.current;
		const column = element?.querySelector<HTMLElement>(`#pipeline-stage-${id}`);
		if (!element || !column) return;
		element.scrollTo({
			left: column.offsetLeft,
			behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
				? "instant"
				: "smooth",
		});
		setActiveColumn(id);
	}

	function resetFilters() {
		setQuery("");
		setStageFilter("open");
		setIdle(false);
		setSort("recent");
	}
	function mutate(
		deal: PipelineDeal,
		optimistic: PipelineDeal,
		run: () => Promise<{ ok: boolean; error?: string }>,
		success: string,
	) {
		if (!canEdit || pending || locked.current) return;
		const previous = deals;
		locked.current = true;
		setError("");
		setNotice("");
		setDeals((current) =>
			current.map((item) => (item.id === deal.id ? optimistic : item)),
		);
		startTransition(async () => {
			try {
				const result = await run();
				if (!result.ok) {
					setDeals(previous);
					setError(result.error || "Não foi possível salvar a alteração.");
					return;
				}
				setNotice(success);
				router.refresh();
			} catch {
				setDeals(previous);
				setError(
					"Não foi possível salvar. A alteração foi desfeita; tente novamente.",
				);
			} finally {
				locked.current = false;
			}
		});
	}
	function moveDeal(id: string, stage: PipelineStage) {
		const deal = deals.find((item) => item.id === id);
		const definition = pipelineStages.find((item) => item.id === stage);
		if (!deal || !definition || deal.stage === stage) return;
		mutate(
			deal,
			{
				...deal,
				stage,
				probability: definition.probability,
				last_activity_at: new Date().toISOString(),
			},
			() => moveDealStageAction(id, stage),
			`${deal.title} movido para ${definition.label}.`,
		);
	}
	function saveValue(deal: PipelineDeal, raw: string) {
		const value = parseDealValue(raw);
		if (value === null) {
			setError(
				"Informe um valor positivo ou zero, com até duas casas decimais.",
			);
			return;
		}
		setEditing(null);
		if (value === deal.value) return;
		mutate(
			deal,
			{ ...deal, value },
			() => updateDealValueAction(deal.id, value),
			`Valor de ${deal.title} atualizado.`,
		);
	}
	function valueControl(deal: PipelineDeal) {
		return editing === deal.id ? (
			<form
				className={styles.valueForm}
				onSubmit={(event) => {
					event.preventDefault();
					saveValue(
						deal,
						String(new FormData(event.currentTarget).get("value") || ""),
					);
				}}
			>
				<label>
					Valor (R$)
					<input
						name="value"
						inputMode="decimal"
						defaultValue={deal.value.toFixed(2)}
						required
						maxLength={20}
						aria-label={`Valor de ${deal.title}`}
					/>
				</label>
				<div>
					<button type="submit" disabled={pending}>
						Salvar
					</button>
					<button type="button" onClick={() => setEditing(null)}>
						Cancelar
					</button>
				</div>
			</form>
		) : (
			<button
				className={styles.valueButton}
				type="button"
				disabled={!canEdit || pending}
				onClick={() => setEditing(deal.id)}
				aria-label={`Editar valor de ${deal.title}: ${money(deal.value)}`}
			>
				{money(deal.value)}
				{canEdit ? <Icon name="edit" /> : null}
			</button>
		);
	}
	function stageControl(deal: PipelineDeal) {
		return (
			<label className={styles.stageControl}>
				<span className="sr-only">Etapa de {deal.title}</span>
				<select
					value={deal.stage}
					disabled={!canEdit || pending}
					onChange={(event) =>
						moveDeal(deal.id, event.target.value as PipelineStage)
					}
				>
					{pipelineStages.map((stage) => (
						<option key={stage.id} value={stage.id}>
							{stage.label}
						</option>
					))}
				</select>
			</label>
		);
	}
	function contactLink(deal: PipelineDeal) {
		return (
			<Link
				href={`/app/contacts/${deal.contact_id}`}
				className={styles.contactLink}
			>
				<span className={styles.avatar}>
					{deal.contact_name.slice(0, 2).toUpperCase()}
				</span>
				<span>
					{deal.contact_name}
					<small>{deal.company || deal.source}</small>
				</span>
			</Link>
		);
	}
	return (
		<>
			<section
				className={appStyles.metricGrid}
				aria-label="Resumo do funil atual"
			>
				{[
					[
						"Oportunidades abertas",
						String(summary.count),
						"Negócios ainda em andamento",
						"pipeline",
					],
					[
						"Pipeline aberto",
						money(summary.value),
						"Valor total em negociação comercial",
						"reports",
					],
					[
						"Forecast ponderado",
						money(summary.forecast),
						"Valor × probabilidade · estimativa",
						"target",
					],
					[
						"Precisam de atenção",
						String(summary.idle),
						"Oportunidades sem atividade há 24h+",
						"clock",
					],
				].map(([label, value, note, icon]) => (
					<article key={label} className={appStyles.metric}>
						<div className={appStyles.metricTop}>
							<Icon
								name={icon as "pipeline" | "reports" | "target" | "clock"}
							/>
							<span>{label}</span>
						</div>
						<strong>{value}</strong>
						<small>{note}</small>
					</article>
				))}
			</section>
			<div className={styles.toolbar}>
				<fieldset
					className={appStyles.segmented}
					aria-label="Visualização do pipeline"
				>
					{[
						["kanban", "Kanban"],
						["table", "Tabela"],
						["forecast", "Forecast"],
					].map(([id, label]) => (
						<button
							key={id}
							type="button"
							aria-pressed={view === id}
							onClick={() => setView(id)}
						>
							{label}
						</button>
					))}
				</fieldset>
				<label className={styles.search}>
					<Icon name="search" />
					<span className="sr-only">
						Buscar oportunidade, contato ou empresa
					</span>
					<input
						type="search"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Oportunidade, contato ou empresa..."
						maxLength={80}
					/>
				</label>
				<label>
					<span className="sr-only">Filtrar etapa</span>
					<select
						value={stageFilter}
						onChange={(event) => setStageFilter(event.target.value)}
					>
						<option value="open">Em andamento</option>
						<option value="all">Todas as etapas</option>
						{pipelineStages.map((stage) => (
							<option key={stage.id} value={stage.id}>
								{stage.label}
							</option>
						))}
					</select>
				</label>
				<label>
					<span className="sr-only">Ordenar oportunidades</span>
					<select
						value={sort}
						onChange={(event) => setSort(event.target.value)}
					>
						<option value="recent">Atividade recente</option>
						<option value="oldest">Mais tempo sem atividade</option>
						<option value="value">Maior valor</option>
					</select>
				</label>
			</div>
			<div className={styles.filterSummary}>
				<button
					className={styles.attentionFilter}
					type="button"
					aria-pressed={idle}
					onClick={() => setIdle((value) => !value)}
				>
					<Icon name="clock" />
					Sem atividade há 24h+
				</button>
				<span>
					{visible.length} de {deals.length} oportunidades
				</span>
				{filtered ? (
					<button type="button" onClick={resetFilters}>
						Limpar filtros
					</button>
				) : null}
			</div>
			<div className={styles.feedback} aria-live="polite" aria-atomic="true">
				{pending ? (
					<p className={styles.saving}>
						<Icon name="refresh" />
						Salvando alteração...
					</p>
				) : notice ? (
					<p className={styles.success}>
						<Icon name="check" />
						{notice}
					</p>
				) : null}
			</div>
			{error ? (
				<p className="error" role="alert">
					{error}
				</p>
			) : null}
			{view === "kanban" && visible.length ? (
				<nav
					className={styles.stageJump}
					aria-label="Ir para uma etapa do Kanban"
				>
					{stageSet.map((stage) => (
						<button
							key={stage.id}
							type="button"
							aria-pressed={activeColumn === stage.id}
							onClick={() => goToColumn(stage.id)}
						>
							{stage.label}
							<span>{visible.filter((d) => d.stage === stage.id).length}</span>
						</button>
					))}
				</nav>
			) : null}
			<section aria-busy={pending} aria-label="Oportunidades do funil">
				{!visible.length ? (
					<div className={appStyles.empty}>
						<Icon name="pipeline" />
						<strong>
							{deals.length
								? "Nenhuma oportunidade corresponde aos filtros."
								: "Seu próximo negócio começa com um lead."}
						</strong>
						<p>
							{deals.length
								? "Ajuste a busca, a etapa ou o filtro de atenção."
								: "Cadastre um contato para criar a primeira oportunidade."}
						</p>
						{deals.length ? (
							<button
								className="button secondary"
								type="button"
								onClick={resetFilters}
							>
								Limpar filtros
							</button>
						) : (
							<Link className="button" href="/app/contacts?new=1#new-contact">
								{canEdit ? "Adicionar lead" : "Ver contatos"}
							</Link>
						)}
					</div>
				) : view === "kanban" ? (
					<section
						ref={board}
						className={styles.board}
						aria-label="Quadro Kanban com rolagem horizontal"
						onScroll={(event) => {
							const element = event.currentTarget;
							const columns = Array.from(element.children) as HTMLElement[];
							const closest = columns.sort(
								(a, b) =>
									Math.abs(a.offsetLeft - element.scrollLeft) -
									Math.abs(b.offsetLeft - element.scrollLeft),
							)[0];
							if (closest)
								setActiveColumn(closest.id.replace("pipeline-stage-", ""));
						}}
						style={{ "--columns": stageSet.length } as CSSProperties}
					>
						{stageSet.map((stage) => {
							const items = visible.filter((deal) => deal.stage === stage.id);
							const total = items.reduce((sum, deal) => sum + deal.value, 0);
							return (
								<fieldset
									key={stage.id}
									id={`pipeline-stage-${stage.id}`}
									className={`${styles.column} ${dropStage === stage.id ? styles.dropTarget : ""}`}
									style={{ "--stage-color": stage.color } as CSSProperties}
									onDragOver={(event) => {
										if (canEdit && dragged && !pending) {
											event.preventDefault();
											setDropStage(stage.id);
										}
									}}
									onDragLeave={(event) => {
										if (
											!event.currentTarget.contains(
												event.relatedTarget as Node | null,
											)
										)
											setDropStage(null);
									}}
									onDrop={(event) => {
										event.preventDefault();
										if (
											dragged &&
											event.dataTransfer.getData("text/plain") === dragged
										)
											moveDeal(dragged, stage.id);
										setDragged(null);
										setDropStage(null);
									}}
								>
									<legend className="sr-only">Etapa {stage.label}</legend>
									<header className={styles.columnHeader}>
										<div>
											<strong>
												<i />
												{stage.label}
											</strong>
											<small>{money(total)}</small>
										</div>
										<span>{items.length}</span>
									</header>
									<div className={styles.cardList}>
										{items.map((deal) => (
											<article
												key={deal.id}
												id={`deal-${deal.id}`}
												className={`${styles.deal} ${dragged === deal.id ? styles.dragging : ""}`}
												draggable={
													canEdit && !compact && !pending && editing !== deal.id
												}
												onDragStart={(event) => {
													setDragged(deal.id);
													event.dataTransfer.effectAllowed = "move";
													event.dataTransfer.setData("text/plain", deal.id);
												}}
												onDragEnd={() => {
													setDragged(null);
													setDropStage(null);
												}}
											>
												<div className={styles.dealHead}>
													<strong>{deal.title}</strong>
													<Icon name="grip" />
												</div>
												{valueControl(deal)}
												{contactLink(deal)}
												<div className={styles.dealMeta}>
													<span>{deal.probability}% de probabilidade</span>
													{isIdleDeal(deal, asOf) ? (
														<span className={styles.idle}>
															<Icon name="clock" />
															24h+
														</span>
													) : null}
												</div>
												<div className={styles.probabilityTrack}>
													<span style={{ width: `${deal.probability}%` }} />
												</div>
												{stageControl(deal)}
												<footer>
													<time dateTime={deal.last_activity_at}>
														{dateTime(deal.last_activity_at, timezone)}
													</time>
													{canEdit ? (
														<Link
															href={`/app/tasks?deal=${deal.id}`}
															aria-label={`Criar follow-up para ${deal.title}`}
														>
															<Icon name="tasks" />
															Follow-up
														</Link>
													) : null}
												</footer>
											</article>
										))}
										{!items.length ? (
											<div className={styles.emptyColumn}>
												{canEdit
													? "Mova uma oportunidade para esta etapa"
													: "Nenhuma oportunidade nesta etapa"}
											</div>
										) : null}
									</div>
								</fieldset>
							);
						})}
					</section>
				) : view === "table" ? (
					<div className={styles.tableWrap}>
						<table>
							<caption className="sr-only">
								Oportunidades filtradas, valores, etapas e contatos
							</caption>
							<thead>
								<tr>
									<th>Oportunidade / contato</th>
									<th>Valor</th>
									<th>Etapa</th>
									<th>Probabilidade</th>
									<th>Última atividade</th>
									<th>Acompanhamento</th>
								</tr>
							</thead>
							<tbody>
								{visible.map((deal) => (
									<tr key={deal.id} id={`deal-${deal.id}`}>
										<td>
											<strong>{deal.title}</strong>
											{contactLink(deal)}
										</td>
										<td>{valueControl(deal)}</td>
										<td>{stageControl(deal)}</td>
										<td>{deal.probability}%</td>
										<td>
											{dateTime(deal.last_activity_at, timezone)}
											{isIdleDeal(deal, asOf) ? (
												<small className={styles.idle}>
													Sem atividade há 24h+
												</small>
											) : null}
										</td>
										<td>
											<Link
												href={
													canEdit
														? `/app/tasks?deal=${deal.id}`
														: `/app/contacts/${deal.contact_id}`
												}
											>
												{canEdit ? "Criar follow-up →" : "Ver contato →"}
											</Link>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<div className={styles.forecast}>
						<div className={styles.forecastIntro}>
							<span>ESTIMATIVA DO PIPELINE FILTRADO</span>
							<strong>{money(shownSummary.forecast)}</strong>
							<p>
								O forecast soma o valor de cada oportunidade aberta multiplicado
								pela sua probabilidade. É uma estimativa comercial.
							</p>
						</div>
						<div className={styles.forecastStages}>
							{pipelineStages
								.filter((stage) => stage.id !== "won" && stage.id !== "lost")
								.map((stage) => {
									const items = openVisible.filter(
										(deal) => deal.stage === stage.id,
									);
									const total = items.reduce(
										(sum, deal) => sum + deal.value,
										0,
									);
									const weighted = items.reduce(
										(sum, deal) => sum + (deal.value * deal.probability) / 100,
										0,
									);
									return (
										<button
											type="button"
											key={stage.id}
											className={styles.forecastStage}
											style={{ "--stage-color": stage.color } as CSSProperties}
											onClick={() => {
												setStageFilter(stage.id);
												setView("table");
											}}
										>
											<div>
												<span>{stage.label}</span>
												<small>
													{items.length} oportunidades · {money(total)}
												</small>
											</div>
											<strong>{money(weighted)}</strong>
											<div className={styles.probabilityTrack}>
												<span
													style={{
														width: `${shownSummary.forecast ? (weighted / shownSummary.forecast) * 100 : 0}%`,
													}}
												/>
											</div>
										</button>
									);
								})}
						</div>
						<p className={styles.hint}>
							Clique em uma etapa para examinar as oportunidades. Negócios
							ganhos e perdidos ficam fora do forecast.
						</p>
					</div>
				)}
			</section>
			<p className={styles.hint}>
				{canEdit
					? "Arraste entre as colunas ou use o seletor de etapa em cada oportunidade. As alterações são salvas com histórico.".replace(
							"Arraste entre as colunas",
							compact
								? "Deslize o quadro para ver as etapas"
								: "Arraste entre as colunas",
						)
					: "Você tem acesso de leitura. Abra um contato para consultar o contexto da oportunidade."}
			</p>
		</>
	);
}
