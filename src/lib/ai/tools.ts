import { tool } from "ai";
import { z } from "zod";
import { searchWeb } from "@/lib/tavily";
import { extractUrl } from "@/lib/tavily";
import { pinJson, listByWallet, unpin, updateJson } from "@/lib/pinata";
import type { KbDocument, KbKeyvalues } from "@/lib/pinata";

// ---------------------------------------------------------------------------
// AUTO-EXECUTE tools (read-only, render rich UI client-side)
// ---------------------------------------------------------------------------

export const askUserQuestion = tool({
  description:
    "Ask the user a structured question. Use 'choice' for multiple-choice, 'text' for open-ended, 'scale' for 1–10 ratings.",
  inputSchema: z.object({
    question: z.string().describe("The question to ask the user"),
    kind: z.enum(["choice", "text", "scale"]).describe("The question type"),
    options: z
      .array(z.string())
      .optional()
      .describe("Answer options for 'choice' questions"),
    scale_min_label: z
      .string()
      .optional()
      .describe("Label for the low end of a scale (e.g. 'Strongly disagree')"),
    scale_max_label: z
      .string()
      .optional()
      .describe("Label for the high end of a scale (e.g. 'Strongly agree')"),
  }),
  execute: async (input) => {
    // Returns the prompt payload; the client renders it as an interactive widget.
    return { ...input, status: "waiting-for-answer" as const };
  },
});

export const tavilySearch = tool({
  description:
    "Search the web for information about a topic, brand, show, book, or entity the user mentions. Use this to enrich follow-up questions.",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
    maxResults: z
      .number()
      .int()
      .min(1)
      .max(8)
      .default(4)
      .describe("Number of results to return"),
  }),
  execute: async ({ query, maxResults }) => {
    return await searchWeb(query, maxResults);
  },
});

export const fetchUrl = tool({
  description:
    "Extract and summarize the content of a URL the user has shared.",
  inputSchema: z.object({
    url: z.string().url().describe("The URL to extract content from"),
  }),
  execute: async ({ url }) => {
    return await extractUrl(url);
  },
});

export const listKnowledgeBase = tool({
  description:
    "List the knowledge base entries already saved for this user. Use this to avoid asking duplicate questions.",
  inputSchema: z.object({
    topic: z
      .string()
      .optional()
      .describe("Filter by topic (e.g. 'hobbies', 'work')"),
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
// HITL (client-side) tools — no execute function, rendered as approval cards
// ---------------------------------------------------------------------------

export const saveKnowledge = tool({
  description:
    "Propose saving a fact or preference to the user's knowledge base. The user must approve before it is stored.",
  inputSchema: z.object({
    type: z
      .enum(["fact", "preference", "link", "profile", "session"])
      .describe("The entry type"),
    topic: z
      .string()
      .describe("A short topic tag, e.g. 'work', 'hobbies', 'media', 'food'"),
    content: z
      .string()
      .describe("The knowledge entry content — be concise but specific"),
    source: z
      .enum(["user", "tavily", "url-extract"])
      .describe("Where this information came from"),
    wallet: z.string().describe("The user's wallet address"),
    title: z.string().optional().describe("Optional short title for the entry"),
    url: z.string().optional().describe("Source URL if from a webpage"),
  }),
  // No execute — becomes a client-side tool requiring user approval
});

export const updateKnowledge = tool({
  description:
    "Propose updating an existing knowledge base entry. Requires user approval.",
  inputSchema: z.object({
    cid: z.string().describe("The IPFS CID of the entry to update"),
    content: z.string().describe("The new content"),
    type: z.enum(["fact", "preference", "link", "profile", "session"]),
    topic: z.string(),
    source: z.enum(["user", "tavily", "url-extract"]),
    wallet: z.string(),
    title: z.string().optional(),
  }),
});

export const deleteKnowledge = tool({
  description:
    "Propose deleting a knowledge base entry. Requires user approval.",
  inputSchema: z.object({
    cid: z.string().describe("The IPFS CID of the entry to delete"),
    wallet: z.string().describe("The user's wallet address (for verification)"),
  }),
});

export const finishOnboarding = tool({
  description:
    "Propose finishing the onboarding session. Call this once 15–20 diverse facts spanning at least 5 topics are saved. Requires user approval.",
  inputSchema: z.object({
    summary: z
      .string()
      .describe(
        "A short 2–3 sentence summary of what was learned about this user"
      ),
    topicsCovered: z
      .array(z.string())
      .describe("List of topic tags that were covered"),
    factCount: z
      .number()
      .int()
      .describe("Total number of facts saved in this session"),
    wallet: z.string(),
  }),
});

// ---------------------------------------------------------------------------
// Server-side execution helpers (called after client approves HITL tools)
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
  tavilySearch,
  fetchUrl,
  listKnowledgeBase,
  saveKnowledge,
  updateKnowledge,
  deleteKnowledge,
  finishOnboarding,
};
