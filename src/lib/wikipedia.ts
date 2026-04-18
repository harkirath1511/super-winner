/**
 * Wikipedia REST summary (no API key). Good for definitions, entities, public facts.
 * @see https://www.mediawiki.org/wiki/API:REST_API
 */
export type WikipediaSummaryResult =
  | {
      ok: true;
      title: string;
      extract: string;
      url: string;
      description?: string;
    }
  | { ok: false; error: string };

export async function wikipediaSummary(query: string): Promise<WikipediaSummaryResult> {
  const q = query.trim().replace(/\s+/g, "_");
  if (!q) return { ok: false, error: "Empty query" };

  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (res.status === 404) return { ok: false, error: "No Wikipedia page for that title" };
    if (!res.ok) return { ok: false, error: `Wikipedia HTTP ${res.status}` };
    const j = (await res.json()) as {
      title?: string;
      extract?: string;
      description?: string;
      content_urls?: { desktop?: { page?: string } };
    };
    const title = j.title ?? query;
    const extract = (j.extract ?? "").trim();
    const pageUrl = j.content_urls?.desktop?.page;
    if (!extract && !pageUrl) return { ok: false, error: "Empty summary" };
    return {
      ok: true,
      title,
      extract: extract || "(Open article for full content)",
      url: pageUrl ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
      description: j.description,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "fetch failed" };
  }
}
