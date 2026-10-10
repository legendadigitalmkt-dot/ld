import Link from "next/link";
import { signOut } from "@/app/login/actions";
export default function AccessPaused() {
	return (
		<main className="section">
			<div className="container" style={{ maxWidth: 620 }}>
				<div className="card">
					<span className="eyebrow">GROWTH OS</span>
					<h1>Acesso pausado</h1>
					<p>
						Esta conta está com o acesso ao software suspenso. Entre em contato
						com o administrador responsável para revisar a situação.
					</p>
					<p>Seus dados permanecem preservados.</p>
					<form action={signOut}>
						<button type="submit" className="btn primary">
							Sair da conta
						</button>
					</form>
					<Link href="/">Voltar ao início</Link>
				</div>
			</div>
		</main>
	);
}
