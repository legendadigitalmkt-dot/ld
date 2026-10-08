import type { Metadata } from "next";
import { GrowthLanding } from "@/components/marketing/growth-landing";
import { marketing } from "@/lib/marketing";

export const metadata: Metadata = {
	title: "Growth OS — O sistema operacional da sua operação comercial",
	description: marketing.description,
	alternates: { canonical: marketing.url },
	openGraph: {
		type: "website",
		locale: "pt_BR",
		url: marketing.url,
		siteName: "Growth OS by Legenda Digital",
		title: "Mais clareza. Mais ação. Mais crescimento. | Growth OS",
		description: marketing.description,
		images: [
			{
				url: `${marketing.url}/opengraph-image`,
				width: 1200,
				height: 630,
				alt: "Growth OS — O sistema operacional comercial da sua empresa",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "Growth OS by Legenda Digital",
		description: marketing.description,
	},
	robots: { index: true, follow: true },
};

export default function Home() {
	return <GrowthLanding />;
}
