/** Canonical site URL for SEO, Open Graph, sitemap, and JSON-LD. Set NEXT_PUBLIC_SITE_URL in production (https). */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}
