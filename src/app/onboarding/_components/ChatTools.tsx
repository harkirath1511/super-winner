"use client";

import { useState } from "react";
import type { DynamicToolUIPart } from "ai";

// ── Types for each tool's input ──────────────────────────────────────────────

interface AskUserQuestionInput {
  question: string;
  kind: "choice" | "text" | "scale";
  options?: string[];
  scale_min_label?: string;
  scale_max_label?: string;
}

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilySearchOutput {
  query: string;
  results: TavilyResult[];
  answer?: string;
}

interface ExtractUrlOutput {
  url: string;
  rawContent: string;
  summary?: string;
}

interface ListKbOutput {
  count: number;
  entries: Array<{
    cid: string;
    name: string;
    type: string;
    topic: string;
    createdAt: string;
  }>;
}

interface SaveKnowledgeInput {
  type: string;
  topic: string;
  content: string;
  source: string;
  wallet: string;
  title?: string;
  url?: string;
}

interface UpdateKnowledgeInput {
  cid: string;
  content: string;
  type: string;
  topic: string;
  source: string;
  wallet: string;
  title?: string;
}

interface DeleteKnowledgeInput {
  cid: string;
  wallet: string;
}

interface FinishOnboardingInput {
  summary: string;
  topicsCovered: string[];
  factCount: number;
  wallet: string;
}

// ── Props ────────────────────────────────────────────────────────────────────

interface ToolPartProps {
  part: DynamicToolUIPart;
  onAddToolResult: (toolCallId: string, toolName: string, result: unknown) => void;
}

// ── AskUserQuestion ──────────────────────────────────────────────────────────

function AskUserQuestionCard({
  part,
  onAddToolResult,
}: ToolPartProps) {
  const input = part.input as AskUserQuestionInput;
  const [textValue, setTextValue] = useState("");
  const [scaleValue, setScaleValue] = useState(5);
  const [answered, setAnswered] = useState(part.state === "output-available");

  const submit = (answer: unknown) => {
    setAnswered(true);
    onAddToolResult(part.toolCallId, part.toolName, { answer, answeredAt: new Date().toISOString() });
  };

  if ((part.state === "input-available" || part.state === "input-streaming") && !answered) {
    return (
      <div className="rounded-xl border border-violet-500/30 bg-violet-950/30 p-4 space-y-3 max-w-lg">
        <p className="text-sm font-medium text-violet-300">
          {input.question}
        </p>

        {input.kind === "choice" && input.options && (
          <div className="flex flex-wrap gap-2">
            {input.options.map((opt) => (
              <button
                key={opt}
                onClick={() => submit(opt)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-violet-700 border border-zinc-700 hover:border-violet-500 text-sm text-zinc-200 transition-all"
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {input.kind === "text" && (
          <div className="flex gap-2">
            <input
              type="text"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && textValue.trim() && submit(textValue.trim())}
              placeholder="Type your answer…"
              className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500"
            />
            <button
              onClick={() => textValue.trim() && submit(textValue.trim())}
              className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm text-white"
            >
              Send
            </button>
          </div>
        )}

        {input.kind === "scale" && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-zinc-500">
              <span>{input.scale_min_label ?? "1"}</span>
              <span className="text-violet-400 font-medium">{scaleValue}</span>
              <span>{input.scale_max_label ?? "10"}</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={scaleValue}
              onChange={(e) => setScaleValue(Number(e.target.value))}
              className="w-full accent-violet-500"
            />
            <button
              onClick={() => submit(scaleValue)}
              className="w-full px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm text-white"
            >
              Submit rating: {scaleValue}/10
            </button>
          </div>
        )}
      </div>
    );
  }

  // Show answered state
  if (part.state === "output-available" || answered) {
    const result = part.output as { answer: unknown } | undefined;
    return (
      <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-3 text-sm text-zinc-400 flex items-start gap-2">
        <span className="text-green-500 mt-0.5">✓</span>
        <span>
          <span className="text-zinc-300">{input.question}</span>
          {result?.answer !== undefined && (
            <span className="ml-2 text-violet-300">
              → {String(result.answer)}
            </span>
          )}
        </span>
      </div>
    );
  }

  return null;
}

// ── TavilySearch ─────────────────────────────────────────────────────────────

function TavilySearchCard({ part, onAddToolResult }: ToolPartProps) {
  const [savedCids, setSavedCids] = useState<Set<string>>(new Set());

  if (part.state === "input-streaming" || part.state === "input-available") {
    return (
      <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-3 text-sm text-zinc-400 flex items-center gap-2">
        <svg className="w-4 h-4 animate-spin text-violet-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Searching: <span className="text-zinc-300 italic">{(part.input as { query: string }).query}</span>
      </div>
    );
  }

  if (part.state !== "output-available") return null;
  const output = part.output as TavilySearchOutput;

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 overflow-hidden max-w-lg">
      <div className="px-4 py-2 border-b border-zinc-700 bg-zinc-800/60 flex items-center gap-2">
        <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="text-sm text-zinc-300 font-medium">
          Search: <span className="text-violet-300">{output.query}</span>
        </span>
        <span className="ml-auto text-xs text-zinc-500">{output.results.length} results</span>
      </div>

      {output.answer && (
        <div className="px-4 py-3 border-b border-zinc-700/50 bg-zinc-800/30">
          <p className="text-sm text-zinc-300">{output.answer}</p>
        </div>
      )}

      <div className="divide-y divide-zinc-700/50">
        {output.results.slice(0, 4).map((r) => (
          <div key={r.url} className="px-4 py-3 hover:bg-zinc-800/40 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-violet-400 hover:text-violet-300 truncate block"
                >
                  {r.title}
                </a>
                <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{r.content}</p>
              </div>
              <button
                onClick={() => {
                  setSavedCids((prev) => new Set([...prev, r.url]));
                  onAddToolResult(part.toolCallId, part.toolName, {
                    action: "save-suggestion",
                    url: r.url,
                    title: r.title,
                    content: r.content,
                  });
                }}
                disabled={savedCids.has(r.url)}
                className="shrink-0 px-2 py-1 rounded-md bg-zinc-700 hover:bg-violet-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-xs text-zinc-300 transition-colors"
              >
                {savedCids.has(r.url) ? "Saved" : "+ Save"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── FetchUrl ─────────────────────────────────────────────────────────────────

function FetchUrlCard({ part }: ToolPartProps) {
  if (part.state === "input-streaming" || part.state === "input-available") {
    return (
      <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-3 text-sm text-zinc-400 flex items-center gap-2">
        <svg className="w-4 h-4 animate-spin text-violet-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Extracting: <span className="text-violet-300 text-xs truncate max-w-xs">{(part.input as { url: string }).url}</span>
      </div>
    );
  }

  if (part.state !== "output-available") return null;
  const output = part.output as ExtractUrlOutput;

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4 max-w-lg space-y-2">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-violet-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        <a href={output.url} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-400 hover:text-violet-300 truncate">
          {output.url}
        </a>
      </div>
      {output.summary && (
        <p className="text-sm text-zinc-300 line-clamp-4">{output.summary}</p>
      )}
    </div>
  );
}

// ── ListKnowledgeBase ─────────────────────────────────────────────────────────

function ListKnowledgeBaseCard({ part }: ToolPartProps) {
  if (part.state !== "output-available") return null;
  const output = part.output as ListKbOutput;

  if (output.count === 0) {
    return (
      <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-3 text-sm text-zinc-500">
        Knowledge base is empty — nothing saved yet.
      </div>
    );
  }

  const topicGroups: Record<string, typeof output.entries> = {};
  for (const entry of output.entries) {
    const t = entry.topic || "general";
    topicGroups[t] = topicGroups[t] ?? [];
    topicGroups[t].push(entry);
  }

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 overflow-hidden max-w-lg">
      <div className="px-4 py-2 border-b border-zinc-700 bg-zinc-800/60 flex items-center justify-between">
        <span className="text-sm text-zinc-300 font-medium">Knowledge Base</span>
        <span className="text-xs text-zinc-500">{output.count} entries</span>
      </div>
      <div className="divide-y divide-zinc-700/50">
        {Object.entries(topicGroups).map(([topic, entries]) => (
          <div key={topic} className="px-4 py-2">
            <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">{topic}</p>
            {entries.map((e) => (
              <p key={e.cid} className="text-sm text-zinc-300 truncate">• {e.name}</p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── HITL Approval Card (shared for save / update / delete / finish) ──────────

interface HitlCardProps {
  part: DynamicToolUIPart;
  onApprove: () => Promise<void>;
  onSkip: () => void;
  label: string;
  description: string;
  detail?: string;
  destructive?: boolean;
}

function HitlCard({ part, onApprove, onSkip, label, description, detail, destructive }: HitlCardProps) {
  const [status, setStatus] = useState<"pending" | "loading" | "done" | "skipped">(
    part.state === "output-available" ? "done" : "pending"
  );

  const handleApprove = async () => {
    setStatus("loading");
    await onApprove();
    setStatus("done");
  };

  if (status === "done") {
    return (
      <div className="rounded-xl border border-green-700/50 bg-green-950/20 p-3 text-sm flex items-center gap-2 max-w-lg">
        <span className="text-green-500">✓</span>
        <span className="text-zinc-300">{label} — approved</span>
      </div>
    );
  }
  if (status === "skipped") {
    return (
      <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-3 text-sm flex items-center gap-2 max-w-lg">
        <span className="text-zinc-500">✗</span>
        <span className="text-zinc-500">{label} — skipped</span>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-4 max-w-lg space-y-3 ${destructive ? "border-red-700/40 bg-red-950/20" : "border-amber-600/30 bg-amber-950/20"}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${destructive ? "bg-red-900/50" : "bg-amber-900/50"}`}>
          {destructive ? (
            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${destructive ? "text-red-300" : "text-amber-300"}`}>{label}</p>
          <p className="text-sm text-zinc-300 mt-0.5">{description}</p>
          {detail && <p className="text-xs text-zinc-500 mt-1 line-clamp-3">{detail}</p>}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleApprove}
          disabled={status === "loading"}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${
            destructive
              ? "bg-red-700 hover:bg-red-600 text-white"
              : "bg-amber-700 hover:bg-amber-600 text-white"
          }`}
        >
          {status === "loading" ? "Processing…" : "Approve"}
        </button>
        <button
          onClick={() => { setSkipped(); onSkip(); }}
          className="flex-1 py-2 rounded-lg text-sm font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-all"
        >
          Skip
        </button>
      </div>
    </div>
  );

  function setSkipped() { setStatus("skipped"); }
}

// ── SaveKnowledge ─────────────────────────────────────────────────────────────

function SaveKnowledgeCard({ part, onAddToolResult }: ToolPartProps) {
  const input = part.input as SaveKnowledgeInput;
  return (
    <HitlCard
      part={part}
      label="Save to knowledge base"
      description={input.title ?? input.content.slice(0, 80)}
      detail={input.title ? input.content.slice(0, 160) : undefined}
      onApprove={async () => {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [],
            toolApprovals: {
              [part.toolCallId]: { approved: true, toolName: "saveKnowledge", args: input },
            },
          }),
        });
        const data = (await res.json()) as { toolResults: Record<string, unknown> };
        const result = data.toolResults[part.toolCallId];
        onAddToolResult(part.toolCallId, part.toolName, result);
      }}
      onSkip={() => onAddToolResult(part.toolCallId, part.toolName, { status: "skipped" })}
    />
  );
}

function UpdateKnowledgeCard({ part, onAddToolResult }: ToolPartProps) {
  const input = part.input as UpdateKnowledgeInput;
  return (
    <HitlCard
      part={part}
      label="Update knowledge entry"
      description={`Update entry (${input.cid.slice(0, 8)}…)`}
      detail={input.content.slice(0, 160)}
      onApprove={async () => {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [],
            toolApprovals: {
              [part.toolCallId]: { approved: true, toolName: "updateKnowledge", args: input },
            },
          }),
        });
        const data = (await res.json()) as { toolResults: Record<string, unknown> };
        onAddToolResult(part.toolCallId, part.toolName, data.toolResults[part.toolCallId]);
      }}
      onSkip={() => onAddToolResult(part.toolCallId, part.toolName, { status: "skipped" })}
    />
  );
}

function DeleteKnowledgeCard({ part, onAddToolResult }: ToolPartProps) {
  const input = part.input as DeleteKnowledgeInput;
  return (
    <HitlCard
      part={part}
      label="Delete knowledge entry"
      description={`Remove CID: ${input.cid.slice(0, 16)}…`}
      destructive
      onApprove={async () => {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [],
            toolApprovals: {
              [part.toolCallId]: { approved: true, toolName: "deleteKnowledge", args: input },
            },
          }),
        });
        const data = (await res.json()) as { toolResults: Record<string, unknown> };
        onAddToolResult(part.toolCallId, part.toolName, data.toolResults[part.toolCallId]);
      }}
      onSkip={() => onAddToolResult(part.toolCallId, part.toolName, { status: "skipped" })}
    />
  );
}

function FinishOnboardingCard({ part, onAddToolResult }: ToolPartProps) {
  const input = part.input as FinishOnboardingInput;
  return (
    <HitlCard
      part={part}
      label="Complete onboarding"
      description={`${input.factCount} facts across ${input.topicsCovered.length} topics`}
      detail={input.summary}
      onApprove={async () => {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [],
            toolApprovals: {
              [part.toolCallId]: { approved: true, toolName: "finishOnboarding", args: input },
            },
          }),
        });
        const data = (await res.json()) as { toolResults: Record<string, unknown> };
        onAddToolResult(part.toolCallId, part.toolName, data.toolResults[part.toolCallId]);
      }}
      onSkip={() => onAddToolResult(part.toolCallId, part.toolName, { status: "skipped" })}
    />
  );
}

// ── Main dispatcher ───────────────────────────────────────────────────────────

export function ToolPartRenderer({ part, onAddToolResult }: ToolPartProps) {
  switch (part.toolName) {
    case "askUserQuestion":
      return <AskUserQuestionCard part={part} onAddToolResult={onAddToolResult} />;
    case "tavilySearch":
      return <TavilySearchCard part={part} onAddToolResult={onAddToolResult} />;
    case "fetchUrl":
      return <FetchUrlCard part={part} onAddToolResult={onAddToolResult} />;
    case "listKnowledgeBase":
      return <ListKnowledgeBaseCard part={part} onAddToolResult={onAddToolResult} />;
    case "saveKnowledge":
      return <SaveKnowledgeCard part={part} onAddToolResult={onAddToolResult} />;
    case "updateKnowledge":
      return <UpdateKnowledgeCard part={part} onAddToolResult={onAddToolResult} />;
    case "deleteKnowledge":
      return <DeleteKnowledgeCard part={part} onAddToolResult={onAddToolResult} />;
    case "finishOnboarding":
      return <FinishOnboardingCard part={part} onAddToolResult={onAddToolResult} />;
    default:
      return null;
  }
}
