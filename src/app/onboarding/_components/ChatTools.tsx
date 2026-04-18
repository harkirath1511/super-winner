"use client";

import { useState } from "react";
import { getToolName, type DynamicToolUIPart, type ToolUIPart, type UITools } from "ai";
import { NeoBtn, NeoPanel, NeoStrip } from "./neo-ui";

/** Static (`tool-*`) and dynamic tool UI parts from the chat stream */
export type AppToolUIPart = ToolUIPart<UITools> | DynamicToolUIPart;

function LoadingToolCard({ label }: { label: string }) {
  return (
    <NeoPanel tone="yellow" className="max-w-xl p-4 text-xs font-black uppercase animate-pulse">
      Loading {label}...
    </NeoPanel>
  );
}

// ── Shared types ─────────────────────────────────────────────────────────────

interface AskUserQuestionInput {
  question: string;
  kind: "choice" | "text" | "scale";
  options?: string[];
  scale_min_label?: string;
  scale_max_label?: string;
  wallet: string;
}

interface SnackRunInput {
  headline: string;
  picks: string[];
  wallet: string;
}

interface VersusPickInput {
  prompt: string;
  optionA: string;
  optionB: string;
  wallet: string;
}

interface ChallengeFactInput {
  claim: string;
  wallet: string;
}

interface StampTagsInput {
  headline: string;
  tags: string[];
  wallet: string;
}

interface OnboardingPulseOutput {
  banner: string;
  factCount: number;
  topicCount: number;
  topics: string[];
  pct: number;
  huntThese: string[];
  pinataError?: boolean;
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

interface WikipediaToolOutput {
  ok: boolean;
  title?: string;
  extract?: string;
  url?: string;
  description?: string;
  error?: string;
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

interface ToolPartProps {
  part: AppToolUIPart;
  onAddToolResult: (toolCallId: string, toolName: string, result: unknown) => void;
}

// ── AskUserQuestion ──────────────────────────────────────────────────────────

function AskUserQuestionCard({ part, onAddToolResult }: ToolPartProps) {
  const raw = part.input as Partial<AskUserQuestionInput> | undefined;
  const [textValue, setTextValue] = useState("");
  const [scaleValue, setScaleValue] = useState(5);
  const [answered, setAnswered] = useState(part.state === "output-available");

  const submit = (answer: unknown) => {
    setAnswered(true);
    onAddToolResult(part.toolCallId, getToolName(part), { answer, answeredAt: new Date().toISOString() });
  };

  const question = raw?.question?.trim() ?? "";
  const kind = raw?.kind;
  const options = Array.isArray(raw?.options) ? raw.options.filter(Boolean) : [];
  const inputReady =
    kind === "choice"
      ? question.length > 0 && options.length > 0
      : kind === "text"
        ? question.length > 0
        : kind === "scale"
          ? question.length > 0
          : false;

  if ((part.state === "input-available" || part.state === "input-streaming") && !answered) {
    if (!inputReady) return <LoadingToolCard label="question" />;
    const input = raw as AskUserQuestionInput;
    return (
      <NeoPanel className="max-w-xl overflow-hidden">
        <NeoStrip>QUESTION</NeoStrip>
        <div className="p-3 space-y-3">
          <p className="text-sm font-black uppercase tracking-tight leading-tight">{input.question}</p>
          {input.kind === "choice" && input.options && (
            <div className="flex flex-wrap gap-2">
              {input.options.map((opt) => (
                <NeoBtn key={opt} variant="lime" className="text-[0.6rem]" onClick={() => submit(opt)}>
                  {opt}
                </NeoBtn>
              ))}
            </div>
          )}
          {input.kind === "text" && (
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && textValue.trim() && submit(textValue.trim())}
                className="neo-input flex-1 px-2 py-2 text-xs font-bold"
              />
              <NeoBtn variant="ink" onClick={() => textValue.trim() && submit(textValue.trim())}>
                LOCK IN
              </NeoBtn>
            </div>
          )}
          {input.kind === "scale" && (
            <div className="space-y-2">
              <div className="flex justify-between text-[0.6rem] font-black uppercase text-neutral-600">
                <span>{input.scale_min_label ?? "LOW"}</span>
                <span className="text-black">{scaleValue}</span>
                <span>{input.scale_max_label ?? "HIGH"}</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={scaleValue}
                onChange={(e) => setScaleValue(Number(e.target.value))}
                className="w-full accent-black"
              />
              <NeoBtn variant="hot" className="w-full" onClick={() => submit(scaleValue)}>
                SUBMIT {scaleValue}
              </NeoBtn>
            </div>
          )}
        </div>
      </NeoPanel>
    );
  }

  if (part.state === "output-available" || answered) {
    const result = part.output as { answer: unknown } | undefined;
    return (
      <NeoPanel tone="lime" className="max-w-xl p-3 flex items-start gap-2 text-xs font-black uppercase">
        <span className="text-black">OK</span>
        <span className="text-neutral-800">
          {question || "(question)"}
          {result?.answer !== undefined && <span className="ml-2 text-black">{String(result.answer)}</span>}
        </span>
      </NeoPanel>
    );
  }
  return null;
}

// ── snackRun ─────────────────────────────────────────────────────────────────

function SnackRunCard({ part, onAddToolResult }: ToolPartProps) {
  const raw = part.input as Partial<SnackRunInput> | undefined;
  const [done, setDone] = useState(part.state === "output-available");

  const pick = (label: string) => {
    setDone(true);
    onAddToolResult(part.toolCallId, getToolName(part), { pick: label, at: new Date().toISOString() });
  };

  const headline = raw?.headline?.trim() ?? "";
  const picks = Array.isArray(raw?.picks) ? raw.picks.filter((p): p is string => typeof p === "string" && p.length > 0) : [];
  const inputReady = headline.length > 0 && picks.length >= 2;

  if ((part.state === "input-available" || part.state === "input-streaming") && !done) {
    if (!inputReady) return <LoadingToolCard label="snack run" />;
    const input = raw as SnackRunInput;
    return (
      <NeoPanel tone="hot" className="max-w-xl overflow-hidden">
        <NeoStrip>SNACK RUN</NeoStrip>
        <div className="p-3 space-y-3">
          <p className="text-sm font-black uppercase leading-tight">{input.headline}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {input.picks.map((p) => (
              <NeoBtn key={p} variant="outline" className="w-full text-[0.6rem] py-3 border-black text-black" onClick={() => pick(p)}>
                {p}
              </NeoBtn>
            ))}
          </div>
        </div>
      </NeoPanel>
    );
  }

  if (part.state === "output-available" || done) {
    const out = part.output as { pick?: string } | undefined;
    return (
      <NeoPanel tone="lime" className="max-w-xl p-3 text-xs font-black uppercase">
        LOCKED: {out?.pick ?? "..."}
      </NeoPanel>
    );
  }
  return null;
}

// ── versusPick ───────────────────────────────────────────────────────────────

function VersusPickCard({ part, onAddToolResult }: ToolPartProps) {
  const raw = part.input as Partial<VersusPickInput> | undefined;
  const [done, setDone] = useState(part.state === "output-available");

  const choose = (side: "A" | "B" | "tie") => {
    setDone(true);
    onAddToolResult(part.toolCallId, getToolName(part), { side, at: new Date().toISOString() });
  };

  const prompt = raw?.prompt?.trim() ?? "";
  const optionA = raw?.optionA?.trim() ?? "";
  const optionB = raw?.optionB?.trim() ?? "";
  const inputReady = prompt.length > 0 && optionA.length > 0 && optionB.length > 0;

  if ((part.state === "input-available" || part.state === "input-streaming") && !done) {
    if (!inputReady) return <LoadingToolCard label="versus" />;
    const input = raw as VersusPickInput;
    return (
      <NeoPanel tone="aqua" className="max-w-xl overflow-hidden">
        <NeoStrip>VERSUS</NeoStrip>
        <div className="p-3 space-y-3">
          <p className="text-xs font-black uppercase leading-snug">{input.prompt}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <NeoBtn variant="lime" className="py-4 text-[0.6rem]" onClick={() => choose("A")}>
              {input.optionA}
            </NeoBtn>
            <NeoBtn variant="outline" className="py-4 text-[0.6rem]" onClick={() => choose("tie")}>
              TIE / BOTH
            </NeoBtn>
            <NeoBtn variant="lime" className="py-4 text-[0.6rem]" onClick={() => choose("B")}>
              {input.optionB}
            </NeoBtn>
          </div>
        </div>
      </NeoPanel>
    );
  }

  if (part.state === "output-available" || done) {
    const out = part.output as { side?: string } | undefined;
    return (
      <NeoPanel className="max-w-xl p-3 text-xs font-black uppercase">
        PICKED: {out?.side ?? "..."}
      </NeoPanel>
    );
  }
  return null;
}

// ── challengeFact ────────────────────────────────────────────────────────────

function ChallengeFactCard({ part, onAddToolResult }: ToolPartProps) {
  const raw = part.input as Partial<ChallengeFactInput> | undefined;
  const [done, setDone] = useState(part.state === "output-available");

  const claim = raw?.claim?.trim() ?? "";
  const inputReady = claim.length > 0;

  const verdict = (v: "yep" | "nope" | "kinda") => {
    setDone(true);
    const input = raw as ChallengeFactInput;
    onAddToolResult(part.toolCallId, getToolName(part), { verdict: v, claim: input.claim, at: new Date().toISOString() });
  };

  if ((part.state === "input-available" || part.state === "input-streaming") && !done) {
    if (!inputReady) return <LoadingToolCard label="challenge" />;
    const input = raw as ChallengeFactInput;
    return (
      <NeoPanel tone="ink" className="max-w-xl overflow-hidden">
        <NeoStrip>CHALLENGE</NeoStrip>
        <div className="p-3 space-y-3">
          <p className="text-sm font-black uppercase leading-snug text-[#d7ff3c]">{input.claim}</p>
          <div className="grid grid-cols-3 gap-2">
            <NeoBtn variant="lime" className="text-[0.55rem]" onClick={() => verdict("yep")}>
              YEP
            </NeoBtn>
            <NeoBtn variant="outline" className="text-[0.55rem] !bg-white/90" onClick={() => verdict("kinda")}>
              KINDA
            </NeoBtn>
            <NeoBtn variant="hot" className="text-[0.55rem]" onClick={() => verdict("nope")}>
              NOPE
            </NeoBtn>
          </div>
        </div>
      </NeoPanel>
    );
  }

  if (part.state === "output-available" || done) {
    const out = part.output as { verdict?: string } | undefined;
    return (
      <NeoPanel tone="lime" className="max-w-xl p-3 text-xs font-black uppercase">
        VERDICT: {out?.verdict ?? "..."}
      </NeoPanel>
    );
  }
  return null;
}

// ── stampTags ────────────────────────────────────────────────────────────────

function StampTagsCard({ part, onAddToolResult }: ToolPartProps) {
  const raw = part.input as Partial<StampTagsInput> | undefined;
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [done, setDone] = useState(part.state === "output-available");

  const headline = raw?.headline?.trim() ?? "";
  const tags = Array.isArray(raw?.tags) ? raw.tags.filter((t): t is string => typeof t === "string" && t.length > 0) : [];
  const inputReady = headline.length > 0 && tags.length >= 2;

  const toggle = (t: string) => {
    setPicked((prev) => {
      const n = new Set(prev);
      if (n.has(t)) n.delete(t);
      else n.add(t);
      return n;
    });
  };

  const commit = () => {
    setDone(true);
    onAddToolResult(part.toolCallId, getToolName(part), { tags: [...picked], at: new Date().toISOString() });
  };

  if ((part.state === "input-available" || part.state === "input-streaming") && !done) {
    if (!inputReady) return <LoadingToolCard label="tags" />;
    const input = raw as StampTagsInput;
    return (
      <NeoPanel className="max-w-xl overflow-hidden">
        <NeoStrip>STAMP TAGS</NeoStrip>
        <div className="p-3 space-y-3">
          <p className="text-xs font-black uppercase">{input.headline}</p>
          <div className="flex flex-wrap gap-2">
            {input.tags.map((t) => {
              const on = picked.has(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggle(t)}
                  className={`neo-btn px-2 py-1 text-[0.55rem] ${on ? "bg-black text-[#d7ff3c]" : "bg-[#fffdf5] text-black"}`}
                >
                  {on ? `[x] ${t}` : t}
                </button>
              );
            })}
          </div>
          <NeoBtn variant="ink" className="w-full" onClick={commit} disabled={picked.size === 0}>
            COMMIT {picked.size}
          </NeoBtn>
        </div>
      </NeoPanel>
    );
  }

  if (part.state === "output-available" || done) {
    const out = part.output as { tags?: string[] } | undefined;
    return (
      <NeoPanel tone="aqua" className="max-w-xl p-3 text-xs font-black uppercase">
        TAGGED: {(out?.tags ?? []).join(", ") || "..."}
      </NeoPanel>
    );
  }
  return null;
}

// ── onboardingPulse ──────────────────────────────────────────────────────────

function OnboardingPulseCard({ part }: ToolPartProps) {
  if (part.state === "input-streaming" || part.state === "input-available") {
    return (
      <NeoPanel tone="lime" className="max-w-xl p-3 flex items-center gap-2 text-xs font-black uppercase animate-pulse">
        PULSE...
      </NeoPanel>
    );
  }
  if (part.state !== "output-available") return null;
  const o = part.output as Partial<OnboardingPulseOutput> | undefined;
  const banner = o?.banner ?? "PROGRESS";
  const pct = typeof o?.pct === "number" ? o.pct : 0;
  const factCount = o?.factCount ?? 0;
  const topicCount = o?.topicCount ?? 0;
  const topics = Array.isArray(o?.topics) ? o!.topics : [];
  const huntThese = Array.isArray(o?.huntThese) ? o!.huntThese : [];
  return (
    <NeoPanel tone="cream" className="max-w-xl overflow-hidden">
      <NeoStrip>PROGRESS HUD</NeoStrip>
      <div className="p-3 space-y-3">
        <p className="text-lg font-black uppercase leading-none">{banner}</p>
        {o?.pinataError && (
          <NeoPanel tone="hot" className="p-2 text-[0.6rem] font-black uppercase">
            PINATA OFFLINE - KEY?
          </NeoPanel>
        )}
        <div className="h-4 w-full border-[3px] border-black bg-white shadow-[2px_2px_0_0_#000]">
          <div className="h-full bg-[#d7ff3c] transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="grid grid-cols-2 gap-2 text-[0.65rem] font-black uppercase">
          <NeoPanel tone="blue" className="p-2 text-[0.65rem] font-black uppercase text-white">
            FACTS {factCount}
          </NeoPanel>
          <NeoPanel tone="purple" className="p-2 text-[0.65rem] font-black uppercase">
            TOPICS {topicCount}
          </NeoPanel>
        </div>
        {huntThese.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {huntThese.map((h) => (
              <span key={h} className="border-[2px] border-black bg-[#ff3d5c] text-[#fffdf5] px-2 py-0.5 text-[0.55rem] font-black uppercase">
                HUNT: {h}
              </span>
            ))}
          </div>
        )}
        {topics.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {topics.map((t) => (
              <span key={t} className="border-2 border-black bg-black text-[#d7ff3c] px-2 py-0.5 text-[0.55rem] font-black uppercase">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </NeoPanel>
  );
}

// ── TavilySearch ─────────────────────────────────────────────────────────────

function TavilySearchCard({ part, onAddToolResult }: ToolPartProps) {
  const [saved, setSaved] = useState<Set<string>>(new Set());

  if (part.state === "input-streaming" || part.state === "input-available") {
    return (
      <NeoPanel tone="lime" className="max-w-xl p-3 text-xs font-black uppercase animate-pulse">
        SEARCH...
      </NeoPanel>
    );
  }
  if (part.state !== "output-available") return null;
  const output = part.output as Partial<TavilySearchOutput> | undefined;
  const results = Array.isArray(output?.results) ? output!.results : [];
  const query = output?.query ?? "search";

  return (
    <NeoPanel className="max-w-xl overflow-hidden">
      <NeoStrip>WEB RAID</NeoStrip>
      <div className="p-2 space-y-2 border-b-[3px] border-black bg-[#d7ff3c]">
        <p className="text-[0.65rem] font-black uppercase">Q: {query}</p>
        {output?.answer && <p className="text-xs font-bold leading-snug normal-case">{output.answer}</p>}
      </div>
      <div className="divide-y-[3px] divide-black">
        {results.slice(0, 5).map((r) => (
          <div key={r.url} className="p-2 flex gap-2 items-start bg-[#fffdf5]">
            <div className="flex-1 min-w-0">
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs font-black uppercase text-[#ff3d5c] underline break-words">
                {r.title}
              </a>
              <p className="text-[0.6rem] font-bold text-neutral-700 line-clamp-2 normal-case">{r.content}</p>
            </div>
            <NeoBtn
              variant="outline"
              className="shrink-0 text-[0.55rem] py-1 px-2"
              disabled={saved.has(r.url)}
              onClick={() => {
                setSaved((s) => new Set(s).add(r.url));
                onAddToolResult(part.toolCallId, getToolName(part), {
                  action: "save-suggestion",
                  url: r.url,
                  title: r.title,
                  content: r.content,
                });
              }}
            >
              {saved.has(r.url) ? "QUEUED" : "SAVE"}
            </NeoBtn>
          </div>
        ))}
      </div>
    </NeoPanel>
  );
}

// ── fetchUrl ─────────────────────────────────────────────────────────────────

function FetchUrlCard({ part }: ToolPartProps) {
  if (part.state === "input-streaming" || part.state === "input-available") {
    return (
      <NeoPanel tone="aqua" className="max-w-xl p-3 text-xs font-black uppercase animate-pulse">
        EXTRACT...
      </NeoPanel>
    );
  }
  if (part.state !== "output-available") return null;
  const output = part.output as ExtractUrlOutput;
  return (
    <NeoPanel className="max-w-xl overflow-hidden">
      <NeoStrip>URL SHRED</NeoStrip>
      <div className="p-3 space-y-2">
        <a href={output.url} target="_blank" rel="noopener noreferrer" className="text-[0.6rem] font-black uppercase text-[#ff3d5c] break-all underline">
          {output.url}
        </a>
        {output.summary && <p className="text-xs font-bold leading-snug normal-case line-clamp-5">{output.summary}</p>}
      </div>
    </NeoPanel>
  );
}

// ── wikipediaSummary ─────────────────────────────────────────────────────────

function WikipediaSummaryCard({ part }: ToolPartProps) {
  if (part.state === "input-streaming" || part.state === "input-available") {
    return (
      <NeoPanel tone="purple" className="max-w-xl p-3 text-xs font-black uppercase animate-pulse">
        WIKIPEDIA...
      </NeoPanel>
    );
  }
  if (part.state !== "output-available") return null;
  const out = part.output as WikipediaToolOutput;
  if (!out.ok) {
    return (
      <NeoPanel tone="hot" className="max-w-xl p-3 text-xs font-black uppercase">
        WIKI: {out.error ?? "unknown error"}
      </NeoPanel>
    );
  }
  return (
    <NeoPanel className="max-w-xl overflow-hidden">
      <NeoStrip>WIKIPEDIA</NeoStrip>
      <div className="p-3 space-y-2">
        <p className="text-sm font-black uppercase">{out.title}</p>
        {out.description && <p className="text-[0.65rem] font-bold text-neutral-600">{out.description}</p>}
        <p className="text-xs font-bold leading-snug normal-case line-clamp-6">{out.extract}</p>
        {out.url && (
          <a href={out.url} target="_blank" rel="noopener noreferrer" className="text-[0.6rem] font-black uppercase text-[#4D96FF] underline break-all">
            Open article
          </a>
        )}
      </div>
    </NeoPanel>
  );
}

// ── listKnowledgeBase ────────────────────────────────────────────────────────

function ListKnowledgeBaseCard({ part }: ToolPartProps) {
  if (part.state !== "output-available") return null;
  const output = part.output as ListKbOutput;
  if (output.count === 0) {
    return (
      <NeoPanel tone="hot" className="max-w-xl p-3 text-xs font-black uppercase">
        KB EMPTY - HIT THEM
      </NeoPanel>
    );
  }
  const topicGroups: Record<string, typeof output.entries> = {};
  for (const entry of output.entries) {
    const t = entry.topic || "general";
    topicGroups[t] = topicGroups[t] ?? [];
    topicGroups[t].push(entry);
  }
  return (
    <NeoPanel className="max-w-xl overflow-hidden">
      <NeoStrip>KB SNAPSHOT ({output.count})</NeoStrip>
      <div className="max-h-48 overflow-y-auto divide-y-[2px] divide-black">
        {Object.entries(topicGroups).map(([topic, entries]) => (
          <div key={topic} className="p-2">
            <p className="text-[0.55rem] font-black uppercase text-neutral-500 mb-1">{topic}</p>
            {entries.map((e) => (
              <p key={e.cid} className="text-[0.65rem] font-bold truncate">
                - {e.name}
              </p>
            ))}
          </div>
        ))}
      </div>
    </NeoPanel>
  );
}

// ── HITL ──────────────────────────────────────────────────────────────────────

interface HitlCardProps {
  part: AppToolUIPart;
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
      <NeoPanel tone="lime" className="max-w-xl p-3 text-xs font-black uppercase flex items-center gap-2">
        <span>OK</span>
        <span>{label}</span>
      </NeoPanel>
    );
  }
  if (status === "skipped") {
    return (
      <NeoPanel className="max-w-xl p-3 text-xs font-black uppercase text-neutral-500">
        SKIPPED: {label}
      </NeoPanel>
    );
  }

  return (
    <NeoPanel tone={destructive ? "hot" : "cream"} className="max-w-xl overflow-hidden">
      <NeoStrip>{destructive ? "DESTROY" : "APPROVAL"}</NeoStrip>
      <div className="p-3 space-y-3">
        <p className="text-xs font-black uppercase">{label}</p>
        <p className="text-sm font-bold leading-snug normal-case">{description}</p>
        {detail && <p className="text-[0.65rem] font-bold text-neutral-600 line-clamp-4 normal-case">{detail}</p>}
        <div className="flex gap-2">
          <NeoBtn variant={destructive ? "hot" : "ink"} className="flex-1" disabled={status === "loading"} onClick={handleApprove}>
            {status === "loading" ? "..." : "YES"}
          </NeoBtn>
          <NeoBtn variant="outline" className="flex-1" onClick={() => { setStatus("skipped"); onSkip(); }}>
            NAH
          </NeoBtn>
        </div>
      </div>
    </NeoPanel>
  );
}

function SaveKnowledgeCard({ part, onAddToolResult: _onAddToolResult }: ToolPartProps) {
  const raw = part.input as Partial<SaveKnowledgeInput> | undefined;
  const ready =
    typeof raw?.content === "string" &&
    raw.content.length > 0 &&
    typeof raw?.wallet === "string" &&
    typeof raw?.topic === "string" &&
    typeof raw?.type === "string" &&
    typeof raw?.source === "string";
  if ((part.state === "input-available" || part.state === "input-streaming") && !ready) {
    return <LoadingToolCard label="save" />;
  }
  if (
    (part.state === "input-available" || part.state === "input-streaming") &&
    ready
  ) {
    const input = raw as SaveKnowledgeInput;
    return (
      <NeoPanel tone="yellow" className="max-w-xl overflow-hidden animate-pulse">
        <NeoStrip>PINNING</NeoStrip>
        <div className="p-3 space-y-2">
          <p className="text-xs font-black uppercase">{input.topic}</p>
          <p className="text-sm font-bold leading-snug normal-case line-clamp-3">
            {input.title ? `${input.title} — ${input.content.slice(0, 120)}` : input.content.slice(0, 160)}
          </p>
        </div>
      </NeoPanel>
    );
  }
  if (part.state === "output-available") {
    const out = part.output as { cid?: string };
    const input = raw as SaveKnowledgeInput;
    return (
      <NeoPanel tone="lime" className="max-w-xl p-3 text-xs font-black uppercase space-y-1">
        <p>PINNED</p>
        <p className="text-[0.65rem] font-bold normal-case text-neutral-800 line-clamp-2">{input.content.slice(0, 140)}</p>
        {out?.cid && (
          <p className="text-[0.55rem] font-mono font-bold text-neutral-600 break-all">CID {out.cid}</p>
        )}
      </NeoPanel>
    );
  }
  if (part.state === "output-error") {
    return (
      <NeoPanel tone="hot" className="max-w-xl p-3 text-xs font-black uppercase">
        PIN FAILED: {(part as { errorText?: string }).errorText ?? "error"}
      </NeoPanel>
    );
  }
  return null;
}

function UpdateKnowledgeCard({ part, onAddToolResult: _onAddToolResult }: ToolPartProps) {
  const raw = part.input as Partial<UpdateKnowledgeInput> | undefined;
  const ready =
    typeof raw?.cid === "string" &&
    raw.cid.length > 0 &&
    typeof raw?.content === "string" &&
    typeof raw?.wallet === "string" &&
    typeof raw?.topic === "string" &&
    typeof raw?.type === "string" &&
    typeof raw?.source === "string";
  if ((part.state === "input-available" || part.state === "input-streaming") && !ready) {
    return <LoadingToolCard label="update" />;
  }
  if (
    (part.state === "input-available" || part.state === "input-streaming") &&
    ready
  ) {
    const input = raw as UpdateKnowledgeInput;
    return (
      <NeoPanel tone="yellow" className="max-w-xl overflow-hidden animate-pulse">
        <NeoStrip>UPDATING</NeoStrip>
        <div className="p-3 space-y-2">
          <p className="text-[0.65rem] font-mono font-bold break-all">CID {input.cid.slice(0, 14)}...</p>
          <p className="text-sm font-bold leading-snug normal-case line-clamp-3">{input.content.slice(0, 160)}</p>
        </div>
      </NeoPanel>
    );
  }
  if (part.state === "output-available") {
    const out = part.output as { cid?: string };
    return (
      <NeoPanel tone="lime" className="max-w-xl p-3 text-xs font-black uppercase">
        <p>UPDATED</p>
        {out?.cid && <p className="text-[0.55rem] font-mono font-bold text-neutral-600 break-all mt-1">CID {out.cid}</p>}
      </NeoPanel>
    );
  }
  if (part.state === "output-error") {
    return (
      <NeoPanel tone="hot" className="max-w-xl p-3 text-xs font-black uppercase">
        UPDATE FAILED: {(part as { errorText?: string }).errorText ?? "error"}
      </NeoPanel>
    );
  }
  return null;
}

function DeleteKnowledgeCard({ part, onAddToolResult: _onAddToolResult }: ToolPartProps) {
  const raw = part.input as Partial<DeleteKnowledgeInput> | undefined;
  const ready = typeof raw?.cid === "string" && raw.cid.length > 0 && typeof raw?.wallet === "string";
  if ((part.state === "input-available" || part.state === "input-streaming") && !ready) {
    return <LoadingToolCard label="delete" />;
  }
  if (
    (part.state === "input-available" || part.state === "input-streaming") &&
    ready
  ) {
    const input = raw as DeleteKnowledgeInput;
    return (
      <NeoPanel tone="hot" className="max-w-xl overflow-hidden animate-pulse">
        <NeoStrip>DELETING</NeoStrip>
        <div className="p-3">
          <p className="text-[0.65rem] font-mono font-bold break-all">{input.cid}</p>
        </div>
      </NeoPanel>
    );
  }
  if (part.state === "output-available") {
    return (
      <NeoPanel className="max-w-xl p-3 text-xs font-black uppercase text-neutral-600">
        DELETED ROW
      </NeoPanel>
    );
  }
  if (part.state === "output-error") {
    return (
      <NeoPanel tone="hot" className="max-w-xl p-3 text-xs font-black uppercase">
        DELETE FAILED: {(part as { errorText?: string }).errorText ?? "error"}
      </NeoPanel>
    );
  }
  return null;
}

function FinishOnboardingCard({ part, onAddToolResult }: ToolPartProps) {
  const raw = part.input as Partial<FinishOnboardingInput> | undefined;
  const ready =
    typeof raw?.summary === "string" &&
    raw.summary.length > 0 &&
    typeof raw?.wallet === "string" &&
    typeof raw?.factCount === "number" &&
    Array.isArray(raw?.topicsCovered);
  if ((part.state === "input-available" || part.state === "input-streaming") && !ready) {
    return <LoadingToolCard label="finish proposal" />;
  }
  if (!ready && part.state !== "output-available") return <LoadingToolCard label="finish proposal" />;
  const input = raw as FinishOnboardingInput;
  return (
    <HitlCard
      part={part}
      label="WRAP SESSION"
      description={`${input.factCount} FACTS / ${input.topicsCovered.length} TOPICS`}
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
        onAddToolResult(part.toolCallId, getToolName(part), data.toolResults[part.toolCallId]);
      }}
      onSkip={() => onAddToolResult(part.toolCallId, getToolName(part), { status: "skipped" })}
    />
  );
}

// ── Unknown tool fallback ───────────────────────────────────────────────────

function UnknownToolCard({ part }: ToolPartProps) {
  return (
    <NeoPanel tone="aqua" className="max-w-xl overflow-hidden">
      <NeoStrip>RAW TOOL / {getToolName(part)}</NeoStrip>
      <pre className="p-3 text-[0.6rem] font-mono whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
        {JSON.stringify({ input: part.input, state: part.state }, null, 2)}
      </pre>
    </NeoPanel>
  );
}

// ── Dispatcher ───────────────────────────────────────────────────────────────

export function ToolPartRenderer({ part, onAddToolResult }: ToolPartProps) {
  switch (getToolName(part)) {
    case "askUserQuestion":
      return <AskUserQuestionCard part={part} onAddToolResult={onAddToolResult} />;
    case "snackRun":
      return <SnackRunCard part={part} onAddToolResult={onAddToolResult} />;
    case "versusPick":
      return <VersusPickCard part={part} onAddToolResult={onAddToolResult} />;
    case "challengeFact":
      return <ChallengeFactCard part={part} onAddToolResult={onAddToolResult} />;
    case "stampTags":
      return <StampTagsCard part={part} onAddToolResult={onAddToolResult} />;
    case "onboardingPulse":
      return <OnboardingPulseCard part={part} onAddToolResult={onAddToolResult} />;
    case "tavilySearch":
      return <TavilySearchCard part={part} onAddToolResult={onAddToolResult} />;
    case "fetchUrl":
      return <FetchUrlCard part={part} onAddToolResult={onAddToolResult} />;
    case "wikipediaSummary":
      return <WikipediaSummaryCard part={part} onAddToolResult={onAddToolResult} />;
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
      return <UnknownToolCard part={part} onAddToolResult={onAddToolResult} />;
  }
}
