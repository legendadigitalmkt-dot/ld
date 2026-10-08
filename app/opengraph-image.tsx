import { ImageResponse } from "next/og";

export const alt =
	"Growth OS — o sistema operacional de crescimento da sua operação comercial";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				justifyContent: "center",
				padding: "70px 80px",
				background: "linear-gradient(125deg, #050816 25%, #112352)",
				color: "#f7faff",
				fontFamily: "sans-serif",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 20,
					marginBottom: 35,
				}}
			>
				<div
					style={{
						display: "flex",
						width: 44,
						height: 44,
						borderRadius: 12,
						background: "linear-gradient(135deg,#f02dce,#754cff,#00d9ff)",
					}}
				/>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						fontSize: 25,
						fontWeight: 700,
					}}
				>
					Growth OS
					<span style={{ fontSize: 13, color: "#9baac4", marginTop: 4 }}>
						by Legenda Digital
					</span>
				</div>
			</div>
			<div
				style={{
					fontSize: 64,
					lineHeight: 1.08,
					fontWeight: 700,
					letterSpacing: "-3px",
				}}
			>
				O sistema operacional
			</div>
			<div
				style={{
					fontSize: 64,
					lineHeight: 1.12,
					fontWeight: 700,
					color: "#54d5ff",
					letterSpacing: "-3px",
				}}
			>
				de crescimento
			</div>
			<div
				style={{
					fontSize: 55,
					lineHeight: 1.18,
					fontWeight: 700,
					letterSpacing: "-2px",
				}}
			>
				da sua operação comercial.
			</div>
			<div style={{ fontSize: 22, marginTop: 35, color: "#a7bad8" }}>
				CRM · WhatsApp · Pipeline · Tarefas · Inteligência comercial
			</div>
			<div style={{ fontSize: 17, marginTop: 45, color: "#7acbff" }}>
				app.legendadigital.com.br
			</div>
		</div>,
		size,
	);
}
