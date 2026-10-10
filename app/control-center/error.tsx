"use client";
import Link from "next/link";
export default function ControlError({ reset }: { reset: () => void }) {
	return (
		<section className="card" style={{ maxWidth: 640, margin: "60px auto" }}>
			<h1>Não foi possível abrir o Control Center.</h1>
			<p>
				O acesso permanece protegido. Tente carregar novamente ou retorne à
				operação.
			</p>
			<button type="button" className="button" onClick={reset}>
				Tentar novamente
			</button>{" "}
			<Link href="/app">Voltar ao Growth OS</Link>
		</section>
	);
}
