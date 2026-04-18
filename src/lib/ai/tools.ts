import { tool } from "ai";
import { z } from "zod";
import { searchWeb } from "@/lib/tavily";
import { extractUrl } from "@/lib/tavily";
import { wikipediaSummary } from "@/lib/wikipedia";
import { pinJson, listByWallet, unpin, updateJson } from "@/lib/pinata";
import type { KbDocument, KbKeyvalues } from "@/lib/pinata";
import { getSession } from "@/lib/session";

async function requireWalletMatchesSession(wallet: string) {
  const session = await getSession();
  const sw = session.wallet?.toLowerCase();
  if (!sw || sw !== wallet.toLowerCase()) {
    throw new Error("Session wallet mismatch");
  }
}

// ---------------------------------------------------------------------------
// Client-interactive tools (no server execute — UI collects answer via addToolResult)
// ---------------------------------------------------------------------------

export const askUserQuestion = tool({
  description:
    "One structured question whose answer maps to a single KB fact (topic + one sentence). Choice options must be parallel and mutually exclusive. No vague life-coach prompts.",
  inputSchema: z.object({
    question: z.string().describe("The question to ask the user"),
    kind: z.enum(["choice", "text", "scale"]).describe("The question type"),
    options: z
      .array(z.string())
      .optional()
      .describe("Answer options for 'choice' questions"),
    scale_min_label: z.string().optional(),
    scale_max_label: z.string().optional(),
    wallet: z.string().describe("The user's wallet address"),
  }),
});

/** Rapid one-tap answers — use instead of open text whenever possible. */
export const snackRun = tool({
  description:
    "One factual dimension per card: headline asks one clear question; picks are 3-6 SAME-KIND answers (all schedules, all tools, etc.). Must be KB-savable. Never mix unrelated labels.",
  inputSchema: z.object({
    headline: z.string().describe("Single-dimension question, ASCII, max ~12 words"),
    picks: z.array(z.string()).min(2).max(6).describe("Parallel tap labels, same category"),
    wallet: z.string(),
  }),
});

/** Force a tradeoff between two concrete options. */
export const versusPick = tool({
  description:
    "One tradeoff axis: prompt names it; optionA and optionB are parallel comparable choices that map to one KB preference. Not random opposites.",
  inputSchema: z.object({
    prompt: z.string(),
    optionA: z.string(),
    optionB: z.string(),
    wallet: z.string(),
  }),
});

/** Present a claim; user confirms or rejects — great for aggressive profiling. */
export const challengeFact = tool({
  description:
    "One testable preference or role claim the user can Yep/Nope/Kinda. If Yep/Kinda, follow with saveKnowledge capturing that fact.",
  inputSchema: z.object({
    claim: z.string(),
    wallet: z.string(),
  }),
});

/** Multi-select persona tags then submit. */
export const stampTags = tool({
  description:
    "4-10 real profile-style tags (work, hobbies, diet, media) under one headline. Tags must be things you could store as KB preferences, not jokes.",
  inputSchema: z.object({
    headline: z.string(),
    tags: z.array(z.string()).min(4).max(10),
    wallet: z.string(),
  }),
});

// ---------------------------------------------------------------------------
// Auto-execute tools (server runs + rich UI)
// ---------------------------------------------------------------------------

export const onboardingPulse = tool({
  description:
    "Flash a progress HUD: fact count, topic breadth, % to goal, and what to hunt next. Call every 1-2 turns.",
  inputSchema: z.object({
    wallet: z.string(),
    banner: z.string().describe("Shouty banner text, ASCII"),
    huntThese: z
      .array(z.string())
      .max(4)
      .optional()
      .describe("Concrete KB gaps only, e.g. Food prefs, Work stack, Media habits - not vague vibes"),
  }),
  execute: async ({ wallet, banner, huntThese }) => {
    try {
      const entries = await listByWallet(wallet);
      const topics = new Set(
        entries.map((e) => e.keyvalues?.topic).filter(Boolean) as string[]
      );
      const target = 14;
      const pct = Math.min(100, Math.round((entries.length / target) * 100));
      return {
        banner,
        factCount: entries.length,
        topicCount: topics.size,
        topics: [...topics].slice(0, 14),
        pct,
        huntThese: huntThese ?? [],
      };
    } catch {
      return {
        banner,
        factCount: 0,
        topicCount: 0,
        topics: [] as string[],
        pct: 0,
        huntThese: huntThese ?? [],
        pinataError: true as const,
      };
    }
  },
});

export const tavilySearch = tool({
  description:
    "Search the web for brands, shows, topics, or entities. Call aggressively when user hints at anything concrete.",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
    maxResults: z
      .number()
      .int()
      .min(1)
      .max(8)
      .default(5)
      .describe("Number of results to return"),
  }),
  execute: async ({ query, maxResults }) => {
    return await searchWeb(query, maxResults);
  },
});

export const fetchUrl = tool({
  description: "Extract a URL the user pasted. Always call when you see http(s).",
  inputSchema: z.object({
    url: z.string().url().describe("The URL to extract content from"),
  }),
  execute: async ({ url }) => {
    return await extractUrl(url);
  },
});

/** Free structured facts from Wikipedia (no API key). Use for entities, places, concepts. */
export const wikipediaSummaryTool = tool({
  description:
    "Look up a Wikipedia article by title (English). Great for definitions, people, places, games, bands. No API key.",
  inputSchema: z.object({
    title: z
      .string()
      .describe("Article title or topic, e.g. 'Large language model' or 'Tokyo'"),
  }),
  execute: async ({ title }) => {
    return await wikipediaSummary(title);
  },
});

export const listKnowledgeBase = tool({
  description:
    "List saved KB rows — call often to avoid duplicate questions and to brag about progress in UI.",
  inputSchema: z.object({
    topic: z.string().optional().describe("Filter by topic"),
    wallet: z.string().describe("The user's wallet address"),
  }),
  execute: async ({ wallet, topic }) => {
    const entries = await listByWallet(wallet, topic ? { topic } : undefined);
    return {
      count: entries.length,
      entries: entries.map((e) => ({
        cid: e.cid,
        name: e.name,
        type: e.keyvalues.type,
        topic: e.keyvalues.topic,
        createdAt: e.createdAt,
      })),
    };
  },
});

// ---------------------------------------------------------------------------
// KB persistence — server execute (pins immediately; session wallet must match)
// ---------------------------------------------------------------------------

export const saveKnowledge = tool({
  description:
    "Save a fact to the user's IPFS KB. Pins immediately when called; wallet must match session. Use after user answers a picker or confirms a concrete fact.",
  inputSchema: z.object({
    type: z.enum(["fact", "preference", "link", "profile", "session"]),
    topic: z.string(),
    content: z.string(),
    source: z.enum(["user", "tavily", "url-extract"]),
    wallet: z.string(),
    title: z.string().optional(),
    url: z.string().optional(),
  }),
  execute: async (args) => {
    await requireWalletMatchesSession(args.wallet);
    return executeSaveKnowledge(args);
  },
});

export const updateKnowledge = tool({
  description:
    "Update an existing KB row (same wallet only). Runs immediately; cid must belong to this wallet.",
  inputSchema: z.object({
    cid: z.string(),
    content: z.string(),
    type: z.enum(["fact", "preference", "link", "profile", "session"]),
    topic: z.string(),
    source: z.enum(["user", "tavily", "url-extract"]),
    wallet: z.string(),
    title: z.string().optional(),
  }),
  execute: async (args) => {
    await requireWalletMatchesSession(args.wallet);
    const mine = await listByWallet(args.wallet);
    if (!mine.some((e) => e.cid === args.cid)) {
      throw new Error("CID not found for this wallet");
    }
    return executeUpdateKnowledge(args);
  },
});

export const deleteKnowledge = tool({
  description:
    "Delete a KB row (same wallet only). Runs immediately; cid must belong to this wallet.",
  inputSchema: z.object({
    cid: z.string(),
    wallet: z.string(),
  }),
  execute: async (args) => {
    await requireWalletMatchesSession(args.wallet);
    const mine = await listByWallet(args.wallet);
    if (!mine.some((e) => e.cid === args.cid)) {
      throw new Error("CID not found for this wallet");
    }
    return executeDeleteKnowledge(args);
  },
});

export const finishOnboarding = tool({
  description:
    "Propose finishing once ~12+ facts across 4+ topics. Requires user approval.",
  inputSchema: z.object({
    summary: z.string(),
    topicsCovered: z.array(z.string()),
    factCount: z.number().int(),
    wallet: z.string(),
  }),
});

// ---------------------------------------------------------------------------
// Server-side execution helpers (HITL approvals)
// ---------------------------------------------------------------------------

export async function executeSaveKnowledge(args: {
  type: KbKeyvalues["type"];
  topic: string;
  content: string;
  source: KbKeyvalues["source"];
  wallet: string;
  title?: string;
  url?: string;
}): Promise<{ cid: string }> {
  const doc: KbDocument = {
    content: args.content,
    title: args.title,
    url: args.url,
    savedAt: new Date().toISOString(),
  };
  const kv: KbKeyvalues = {
    wallet: args.wallet,
    type: args.type,
    topic: args.topic,
    source: args.source,
  };
  const cid = await pinJson(doc, kv);
  return { cid };
}

export async function executeUpdateKnowledge(args: {
  cid: string;
  content: string;
  type: KbKeyvalues["type"];
  topic: string;
  source: KbKeyvalues["source"];
  wallet: string;
  title?: string;
}): Promise<{ cid: string }> {
  const doc: KbDocument = {
    content: args.content,
    title: args.title,
    savedAt: new Date().toISOString(),
  };
  const kv: KbKeyvalues = {
    wallet: args.wallet,
    type: args.type,
    topic: args.topic,
    source: args.source,
  };
  const newCid = await updateJson(args.cid, doc, kv);
  return { cid: newCid };
}

export async function executeDeleteKnowledge(args: {
  cid: string;
  wallet: string;
}): Promise<{ deleted: boolean }> {
  await unpin(args.cid);
  return { deleted: true };
}

export const allTools = {
  askUserQuestion,
  snackRun,
  versusPick,
  challengeFact,
  stampTags,
  onboardingPulse,
  tavilySearch,
  fetchUrl,
  wikipediaSummary: wikipediaSummaryTool,
  listKnowledgeBase,
  saveKnowledge,
  updateKnowledge,
  deleteKnowledge,
  finishOnboarding,
};
