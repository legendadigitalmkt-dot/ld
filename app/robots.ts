import type { MetadataRoute } from "next";
import { marketing } from "@/lib/marketing";

export default function robots(): MetadataRoute.Robots {
	return {
		rules: {
			userAgent: "*",
			allow: "/",
			disallow: [
				"/app",
				"/control-center",
				"/access-paused",
				"/onboarding",
				"/login",
				"/auth/",
				"/api/",
				"/forgot-password",
				"/reset-password",
			],
		},
		sitemap: `${marketing.url}/sitemap.xml`,
	};
}
