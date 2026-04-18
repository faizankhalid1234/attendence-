import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/member/", "/company/", "/super-admin/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: new URL(base).host,
  };
}
