import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = SITE.url;
  // Only the public landing page is indexed. App pages (/dashboard,
  // /knowledge, /settings, /inbox) are behind auth and Disallowed in robots.
  const routes = ["/"];
  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 1,
  }));
}
