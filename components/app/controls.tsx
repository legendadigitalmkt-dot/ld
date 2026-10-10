"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/login/actions";
import {
	searchWorkspace,
	switchWorkspace,
	type SearchItem,
} from "@/app/(protected)/app/shell-actions";
import { Icon, GrowthMark } from "@/components/ui/icons";
import { appNavigation } from "@/lib/app-navigation";
import { roleLabels } from "@/lib/operational";
import type { CurrentWorkspace } from "@/lib/workspace";
import { AppNavigation } from "./navigation";
import styles from "./app.module.css";

export function AppControls({
	workspace,
	workspaces,
	email,
	notices,
}: {
	workspace: CurrentWorkspace;
	workspaces: CurrentWorkspace[];
	email: string | null;
	notices: { overdue: number; unread: number; available: boolean };
}) {
	const admin = ["owner", "admin"].includes(workspace.role);
	const pathname = usePathname();
	const label =
		appNavigation.find(
			(item) => item.href !== "/app" && pathname.startsWith(item.href),
		)?.label || "Visão geral";
	const [searchOpen, setSearchOpen] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [items, setItems] = useState<SearchItem[]>([]);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const searchDialog = useRef<HTMLDialogElement>(null);
	const menuDialog = useRef<HTMLDialogElement>(null);
	const searchInput = useRef<HTMLInputElement>(null);
	useEffect(() => {
		if (!menuOpen && !searchOpen) return;
		const previous = document.documentElement.style.overflow;
		document.documentElement.style.overflow = "hidden";
		return () => {
			document.documentElement.style.overflow = previous;
		};
	}, [menuOpen, searchOpen]);
	useEffect(() => {
		const keydown = (event: KeyboardEvent) => {
			if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				setSearchOpen((value) => !value);
			}
		};
		document.addEventListener("keydown", keydown);
		return () => document.removeEventListener("keydown", keydown);
	}, []);
	useEffect(() => {
		if (searchOpen) {
			searchDialog.current?.showModal();
			searchInput.current?.focus();
		} else searchDialog.current?.close();
	}, [searchOpen]);
	useEffect(() => {
		if (menuOpen) menuDialog.current?.showModal();
		else menuDialog.current?.close();
	}, [menuOpen]);
	useEffect(() => {
		let active = true;
		setItems([]);
		setError("");
		if (!searchOpen || query.trim().length < 2) {
			setBusy(false);
			return;
		}
		setBusy(true);
		const timer = setTimeout(async () => {
			try {
				const result = await searchWorkspace(query);
				if (active) {
					setItems(result.items);
					setError(result.error || "");
					setBusy(false);
				}
			} catch {
				if (active) {
					setError(
						"Não foi possível concluir a busca. Atualize a página se sua sessão expirou.",
					);
					setBusy(false);
				}
			}
		}, 280);
		return () => {
			active = false;
			clearTimeout(timer);
		};
	}, [query, searchOpen]);
	const commands = appNavigation.filter(
		(item) =>
			(!item.admin || admin) &&
			item.label
				.toLocaleLowerCase("pt-BR")
				.includes(query.trim().toLocaleLowerCase("pt-BR")),
	);
	return (
		<>
			<div className={styles.topbar}>
				<button
					type="button"
					className={`${styles.iconButton} ${styles.mobileToggle}`}
					aria-label="Abrir navegação"
					aria-expanded={menuOpen}
					onClick={() => setMenuOpen(true)}
				>
					<Icon name="menu" />
				</button>
				<div className={styles.breadcrumb}>
					<span>Growth OS</span>
					<span>/</span>
					<strong>{label}</strong>
				</div>
				<button
					type="button"
					className={styles.searchTrigger}
					aria-label="Buscar na operação"
					onClick={() => setSearchOpen(true)}
				>
					<Icon name="search" />
					<span>Buscar na operação...</span>
					<kbd>⌘ / Ctrl K</kbd>
				</button>
				<details className={styles.dropdown}>
					<summary
						className={styles.iconButton}
						aria-label="Avisos da operação"
					>
						<Icon name="bell" />
						{notices.overdue + notices.unread > 0 ? (
							<span className={styles.notificationDot} />
						) : null}
					</summary>
					<div className={styles.dropdownPanel}>
						<strong>Avisos da operação</strong>
						<p>Atualizados ao carregar a página.</p>
						{notices.available ? (
							<>
								<Link href="/app/tasks?status=overdue">
									{notices.overdue} tarefas atrasadas <Icon name="arrow" />
								</Link>
								<Link href="/app/inbox">
									{notices.unread} conversas não lidas <Icon name="arrow" />
								</Link>
							</>
						) : (
							<p>Não foi possível atualizar os avisos.</p>
						)}
					</div>
				</details>
				<details className={styles.dropdown}>
					<summary className={styles.userAvatar} aria-label="Menu da conta">
						{(email || workspace.name).slice(0, 2).toUpperCase()}
					</summary>
					<div className={styles.dropdownPanel}>
						<strong>{email || "Sua conta"}</strong>
						<p>
							{roleLabels[workspace.role]} · {workspace.name}
						</p>
						<Link href="/">
							Página do produto <Icon name="arrow" />
						</Link>
						<form action={signOut}>
							<button type="submit" className={styles.quietButton}>
								Sair da conta
							</button>
						</form>
					</div>
				</details>
			</div>
			<dialog
				ref={menuDialog}
				className={styles.drawer}
				onClose={() => setMenuOpen(false)}
				aria-label="Menu do workspace"
			>
				<div className={styles.drawerHeader}>
					<GrowthMark />
					<strong>Growth OS</strong>
					<button
						type="button"
						className={styles.iconButton}
						aria-label="Fechar navegação"
						onClick={() => setMenuOpen(false)}
					>
						<Icon name="close" />
					</button>
				</div>
				<div className={styles.workspaceCard}>
					<span>WORKSPACE</span>
					<strong>{workspace.name}</strong>
					<small>{roleLabels[workspace.role]}</small>
				</div>
				<AppNavigation admin={admin} close={() => setMenuOpen(false)} />
				<WorkspacePicker
					workspace={workspace}
					workspaces={workspaces}
					instance="drawer"
				/>
			</dialog>
			<dialog
				ref={searchDialog}
				className={styles.commandDialog}
				onClose={() => setSearchOpen(false)}
				aria-labelledby="growth-search-title"
			>
				<div className={styles.commandHeader}>
					<Icon name="search" />
					<label id="growth-search-title" htmlFor="growth-search">
						Buscar no workspace
					</label>
					<button
						type="button"
						className={styles.iconButton}
						aria-label="Fechar busca"
						onClick={() => setSearchOpen(false)}
					>
						<Icon name="close" />
					</button>
				</div>
				<input
					ref={searchInput}
					id="growth-search"
					type="search"
					value={query}
					maxLength={80}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="Contato, oportunidade, tarefa ou tela..."
					autoComplete="off"
				/>
				<div
					className={styles.searchResults}
					aria-live="polite"
					aria-busy={busy}
				>
					{commands.length ? (
						<>
							<span className={styles.navGroup}>Ir para</span>
							{commands.map((item) => (
								<Link
									key={item.href}
									href={item.href}
									onClick={() => setSearchOpen(false)}
								>
									<Icon name={item.icon} />
									<strong>{item.label}</strong>
									<Icon name="arrow" />
								</Link>
							))}
						</>
					) : null}
					{query.trim().length >= 2 ? (
						<>
							<span className={styles.navGroup}>
								Resultados em {workspace.name}
							</span>
							{busy ? (
								<p>Buscando...</p>
							) : error ? (
								<p role="alert">{error}</p>
							) : items.length ? (
								items.map((item) => (
									<Link
										key={`${item.kind}-${item.id}`}
										href={item.href}
										onClick={() => setSearchOpen(false)}
									>
										<Icon
											name={
												item.kind === "Contato"
													? "contacts"
													: item.kind === "Tarefa"
														? "tasks"
														: "pipeline"
											}
										/>
										<div>
											<strong>{item.title}</strong>
											<small>{item.kind}</small>
										</div>
										<Icon name="arrow" />
									</Link>
								))
							) : (
								<p>Nenhum registro encontrado.</p>
							)}
						</>
					) : (
						<p>
							Digite pelo menos dois caracteres para pesquisar seus registros.
						</p>
					)}
				</div>
				<div className={styles.commandFooter}>
					Busca restrita ao workspace atual · Esc para fechar
				</div>
			</dialog>
		</>
	);
}

export function WorkspacePicker({
	workspace,
	workspaces,
	instance,
}: {
	workspace: CurrentWorkspace;
	workspaces: CurrentWorkspace[];
	instance: string;
}) {
	return workspaces.length > 1 ? (
		<form action={switchWorkspace} className={styles.workspacePicker}>
			<label htmlFor={`workspace-${instance}-${workspace.id}`}>
				Trocar workspace
			</label>
			<div>
				<select
					id={`workspace-${instance}-${workspace.id}`}
					name="workspaceId"
					defaultValue={workspace.id}
				>
					{workspaces.map((item) => (
						<option key={item.id} value={item.id}>
							{item.name}
						</option>
					))}
				</select>
				<button
					type="submit"
					className={styles.iconButton}
					aria-label="Confirmar troca de workspace"
				>
					<Icon name="arrow" />
				</button>
			</div>
		</form>
	) : (
		<div className={styles.workspaceSingle}>
			<Icon name="shield" />
			<span>Acesso restrito ao seu workspace</span>
		</div>
	);
}
