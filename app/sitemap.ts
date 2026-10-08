import type { MetadataRoute } from "next";
import { marketing } from "@/lib/marketing";

export default function sitemap(): MetadataRoute.Sitemap {
	return [{ url: marketing.url, changeFrequency: "weekly", priority: 1 }];
}
