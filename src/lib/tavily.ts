const TAVILY_API = "https://api.tavily.com";
const getKey = () => process.env.TAVILY_API_KEY ?? "";

export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface SearchResponse {
  query: string;
  results: TavilyResult[];
  answer?: string;
}

export async function searchWeb(
  query: string,
  maxResults = 5
): Promise<SearchResponse> {
  const res = await fetch(`${TAVILY_API}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getKey()}`,
    },
    body: JSON.stringify({
      query,
      max_results: maxResults,
      include_answer: true,
      search_depth: "basic",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tavily search failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as {
    query: string;
    results: Array<{ title: string; url: string; content: string; score: number }>;
    answer?: string;
  };
  return {
    query: json.query,
    results: json.results,
    answer: json.answer,
  };
}

export interface ExtractResponse {
  url: string;
  rawContent: string;
  summary?: string;
}

export async function extractUrl(url: string): Promise<ExtractResponse> {
  const res = await fetch(`${TAVILY_API}/extract`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getKey()}`,
    },
    body: JSON.stringify({ urls: [url] }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tavily extract failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as {
    results: Array<{ url: string; raw_content: string }>;
  };
  const first = json.results[0];
  return {
    url: first?.url ?? url,
    rawContent: first?.raw_content ?? "",
    summary: first?.raw_content?.slice(0, 500),
  };
}
