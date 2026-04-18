"use client";

import type { PinataEntry } from "@/lib/pinata";
import { NeoBtn, NeoPanel, NeoStrip } from "../../onboarding/_components/neo-ui";

export interface EntryWithDoc extends PinataEntry {
  doc: {
    content: string;
    title?: string;
    url?: string;
    savedAt: string;
  } | null;
}

function hashToUnit(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

type Hub = { cx: number; cy: number; topic: string };

function layoutHubs(topicKeys: string[]): Hub[] {
  const keys = [...topicKeys].sort((a, b) => a.localeCompare(b));
  const n = keys.length;
  if (n === 0) return [];
  if (n === 1) return [{ cx: 50, cy: 50, topic: keys[0]! }];
  const r = 34;
  return keys.map((topic, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    return {
      topic,
      cx: 50 + r * Math.cos(angle),
      cy: 50 + r * Math.sin(angle) * 0.92,
    };
  });
}

function orbitNode(hub: Hub, entry: EntryWithDoc, index: number, total: number): { x: number; y: number; size: "sm" | "md" | "lg" } {
  const u = hashToUnit(entry.cid);
  const ring = (index % 3) + 1;
  const spread = u * Math.PI * 2 + index * 0.85;
  const dist = 11 + ring * 6.5 + (u * 7);
  const x = hub.cx + dist * Math.cos(spread);
  const y = hub.cy + dist * Math.sin(spread) * 0.95;
  const size: "sm" | "md" | "lg" = total > 12 ? "sm" : total > 6 ? "md" : "lg";
  return {
    x: Math.min(94, Math.max(6, x)),
    y: Math.min(90, Math.max(10, y)),
    size,
  };
}

interface KbWebMapProps {
  grouped: Record<string, EntryWithDoc[]>;
  topicSkin: (topic: string) => string;
  expandedCid: string | null;
  setExpandedCid: (cid: string | null) => void;
  deletingCid: string | null;
  onDelete: (cid: string) => void;
  gatewayBase: string;
}

export function KbWebMap({
  grouped,
  topicSkin,
  expandedCid,
  setExpandedCid,
  deletingCid,
  onDelete,
  gatewayBase,
}: KbWebMapProps) {
  const topicKeys = Object.keys(grouped).sort((a, b) => a.localeCompare(b));
  const hubs = layoutHubs(topicKeys);
  const hubByTopic = Object.fromEntries(hubs.map((h) => [h.topic, h])) as Record<string, Hub>;

  const lines: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];
  for (const topic of topicKeys) {
    const hub = hubByTopic[topic];
    if (!hub) continue;
    const list = grouped[topic] ?? [];
    list.forEach((entry, j) => {
      const { x, y } = orbitNode(hub, entry, j, list.length);
      lines.push({ x1: hub.cx, y1: hub.cy, x2: x, y2: y, key: `${topic}-${entry.cid}` });
    });
  }

  const selected =
    expandedCid != null ? Object.values(grouped).flat().find((e) => e.cid === expandedCid) ?? null : null;

  const nodeSizeClass = (s: "sm" | "md" | "lg") =>
    s === "sm" ? "w-14 h-14 min-w-14" : s === "md" ? "w-[4.25rem] h-[4.25rem] min-w-[4.25rem]" : "w-20 h-20 min-w-20";

  return (
    <div className="relative">
      <div className="relative w-full min-h-[min(680px,82vh)] rounded-[28px] border-[4px] border-black bg-[#f0ebe3] shadow-[10px_10px_0_0_#000] overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.12] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #000 1px, transparent 0)`,
            backgroundSize: "22px 22px",
          }}
          aria-hidden
        />

        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          {lines.map((l) => (
            <line
              key={l.key}
              x1={l.x1}
              y1={l.y1}
              x2={l.x2}
              y2={l.y2}
              stroke="#0a0a0a"
              strokeWidth={0.35}
              strokeLinecap="round"
              opacity={0.55}
            />
          ))}
        </svg>

        {hubs.map((hub) => (
          <div
            key={hub.topic}
            className="absolute z-10 flex flex-col items-center -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: `${hub.cx}%`, top: `${hub.cy}%` }}
          >
            <div
              className={`border-[3px] border-black px-3 py-1.5 text-[0.65rem] font-black uppercase shadow-[4px_4px_0_0_#000] whitespace-nowrap ${topicSkin(hub.topic)}`}
            >
              {hub.topic}
            </div>
            <span className="mt-1 text-[0.5rem] font-black text-neutral-500 bg-white/90 border border-black px-1.5 py-0.5 rounded-full">
              {(grouped[hub.topic] ?? []).length} pins
            </span>
          </div>
        ))}

        {topicKeys.map((topic) => {
          const hub = hubByTopic[topic];
          if (!hub) return null;
          const list = grouped[topic] ?? [];
          return list.map((entry, j) => {
            const { x, y, size } = orbitNode(hub, entry, j, list.length);
            const isSel = expandedCid === entry.cid;
            const preview = (entry.doc?.title || entry.doc?.content || entry.name).slice(0, 42);
            return (
              <button
                key={entry.cid}
                type="button"
                className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-2xl border-[3px] border-black font-black uppercase shadow-[4px_4px_0_0_#000] transition-transform hover:scale-105 hover:z-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4D96FF] ${topicSkin(
                  entry.keyvalues?.topic || topic
                )} ${nodeSizeClass(size)} flex flex-col items-center justify-center p-1 text-center pointer-events-auto ${
                  isSel ? "ring-2 ring-black scale-110 z-30" : ""
                }`}
                style={{ left: `${x}%`, top: `${y}%` }}
                onClick={() => setExpandedCid(isSel ? null : entry.cid)}
                title={entry.doc?.content ?? entry.name}
              >
                <span className="text-[0.45rem] leading-tight opacity-80">{entry.keyvalues?.type ?? "fact"}</span>
                <span className="text-[0.5rem] leading-[1.1] line-clamp-3 normal-case font-bold mt-0.5">{preview}</span>
              </button>
            );
          });
        })}
      </div>

      {selected && (
        <div className="fixed inset-x-3 bottom-3 z-50 sm:absolute sm:inset-auto sm:right-4 sm:top-24 sm:w-[min(100%,380px)] sm:left-auto">
          <NeoPanel className="overflow-hidden shadow-[8px_8px_0_0_#000] border-[4px] border-black">
            <NeoStrip>INSPECT PIN</NeoStrip>
            <div className="p-4 space-y-3 max-h-[50vh] overflow-y-auto bg-white">
              <div className="flex flex-wrap gap-2">
                <span className={`text-[0.55rem] font-black uppercase border-2 border-black px-1.5 ${topicSkin(selected.keyvalues?.topic || "general")}`}>
                  {selected.keyvalues?.topic ?? "general"}
                </span>
                <span className="text-[0.55rem] font-black uppercase border-2 border-black px-1.5 bg-neutral-100">
                  {selected.keyvalues?.type ?? "fact"}
                </span>
                <span className="text-[0.55rem] font-bold text-neutral-500">
                  {new Date(selected.createdAt).toLocaleDateString()}
                </span>
              </div>
              {selected.doc?.title && <p className="text-sm font-black uppercase">{selected.doc.title}</p>}
              <p className="text-sm font-bold normal-case leading-snug">{selected.doc?.content ?? selected.name}</p>
              {selected.doc?.url && (
                <a href={selected.doc.url} target="_blank" rel="noopener noreferrer" className="text-xs font-black text-[#4D96FF] underline break-all block">
                  {selected.doc.url}
                </a>
              )}
              <p className="text-[0.55rem] font-mono font-bold break-all text-neutral-600">CID {selected.cid}</p>
              {selected.keyvalues?.source && (
                <p className="text-[0.55rem] font-black uppercase text-neutral-500">SRC {selected.keyvalues.source}</p>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                <a href={`${gatewayBase}/ipfs/${selected.cid}`} target="_blank" rel="noopener noreferrer">
                  <NeoBtn variant="lime" className="text-xs py-2">
                    OPEN IPFS
                  </NeoBtn>
                </a>
                <NeoBtn variant="hot" className="text-xs py-2" disabled={deletingCid === selected.cid} onClick={() => onDelete(selected.cid)}>
                  {deletingCid === selected.cid ? "..." : "DELETE"}
                </NeoBtn>
                <NeoBtn variant="outline" className="text-xs py-2" onClick={() => setExpandedCid(null)}>
                  CLOSE
                </NeoBtn>
              </div>
            </div>
          </NeoPanel>
        </div>
      )}
    </div>
  );
}
