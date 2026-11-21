import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = SITE.url;
  const routes = ["/", "/dashboard", "/knowledge", "/settings"];
  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : 0.5,
  }));
}
