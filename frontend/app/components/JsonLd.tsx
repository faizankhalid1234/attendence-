type JsonLdProps = {
  data: Record<string, unknown>;
};

/** Server-safe JSON-LD for SEO (e.g. SoftwareApplication / WebSite). */
export default function JsonLd({ data }: JsonLdProps) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
