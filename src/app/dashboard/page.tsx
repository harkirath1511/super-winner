"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { PinataEntry } from "@/lib/pinata";

interface EntryWithDoc extends PinataEntry {
  doc: {
    content: string;
    title?: string;
    url?: string;
    savedAt: string;
  } | null;
}

const TOPIC_COLORS: Record<string, string> = {
  work: "bg-blue-900/40 text-blue-300 border-blue-700/40",
  hobbies: "bg-green-900/40 text-green-300 border-green-700/40",
  media: "bg-pink-900/40 text-pink-300 border-pink-700/40",
  food: "bg-orange-900/40 text-orange-300 border-orange-700/40",
  values: "bg-purple-900/40 text-purple-300 border-purple-700/40",
  technology: "bg-cyan-900/40 text-cyan-300 border-cyan-700/40",
  travel: "bg-teal-900/40 text-teal-300 border-teal-700/40",
  general: "bg-zinc-800 text-zinc-400 border-zinc-700",
};

function topicClass(topic: string): string {
  return TOPIC_COLORS[topic.toLowerCase()] ?? TOPIC_COLORS.general;
}

export default function DashboardPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<EntryWithDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [wallet, setWallet] = useState("");
  const [filterTopic, setFilterTopic] = useState<string>("");
  const [deletingCid, setDeletingCid] = useState<string | null>(null);
  const [expandedCid, setExpandedCid] = useState<string | null>(null);

  const fetchEntries = useCallback(async (topic?: string) => {
    const params = new URLSearchParams({ withContent: "1" });
    if (topic) params.set("topic", topic);
    const res = await fetch(`/api/kb?${params}`);
    if (!res.ok) throw new Error("Failed to load");
    const data = (await res.json()) as { entries: EntryWithDoc[] };
    return data.entries;
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then(async (data: { authenticated: boolean; wallet?: string }) => {
        if (!data.authenticated || !data.wallet) {
          router.replace("/");
          return;
        }
        setWallet(data.wallet);
        const e = await fetchEntries();
        setEntries(e);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load");
        setLoading(false);
      });
  }, [router, fetchEntries]);

  const handleFilterChange = async (topic: string) => {
    setFilterTopic(topic);
    setLoading(true);
    try {
      const e = await fetchEntries(topic || undefined);
      setEntries(e);
    } catch {
      setError("Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (cid: string) => {
    setDeletingCid(cid);
    try {
      const res = await fetch(`/api/kb?cid=${cid}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setEntries((prev) => prev.filter((e) => e.cid !== cid));
    } catch {
      setError("Delete failed");
    } finally {
      setDeletingCid(null);
    }
  };

  const topics = Array.from(new Set(entries.map((e) => e.keyvalues?.topic).filter(Boolean)));

  const grouped: Record<string, EntryWithDoc[]> = {};
  for (const e of entries) {
    const t = e.keyvalues?.topic || "general";
    grouped[t] = grouped[t] ?? [];
    grouped[t].push(e);
  }

  if (loading && entries.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="flex items-center gap-3 text-zinc-400">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading knowledge base…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
            <span className="text-sm">🧠</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-100">Knowledge Base</p>
            <p className="text-xs text-zinc-500">
              {wallet.slice(0, 6)}…{wallet.slice(-4)} · {entries.length} entries
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/onboarding")}
            className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors"
          >
            Continue onboarding
          </button>
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.replace("/");
            }}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <div className="px-4 py-3 rounded-xl border border-red-700/40 bg-red-950/20 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Filters */}
        {topics.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleFilterChange("")}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                filterTopic === ""
                  ? "bg-violet-700 border-violet-600 text-white"
                  : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              All
            </button>
            {topics.map((t) => (
              <button
                key={t}
                onClick={() => handleFilterChange(t)}
                className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                  filterTopic === t
                    ? "bg-violet-700 border-violet-600 text-white"
                    : `${topicClass(t)}`
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {entries.length === 0 && !loading && (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center text-3xl">
              📭
            </div>
            <div className="space-y-1">
              <p className="text-zinc-300 font-medium">No entries yet</p>
              <p className="text-zinc-500 text-sm">
                Complete your onboarding to start building your knowledge base.
              </p>
            </div>
            <button
              onClick={() => router.push("/onboarding")}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
            >
              Start onboarding
            </button>
          </div>
        )}

        {/* Grouped entries */}
        {Object.entries(grouped).map(([topic, topicEntries]) => (
          <div key={topic} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs border font-medium ${topicClass(topic)}`}>
                {topic}
              </span>
              <span className="text-zinc-600 text-xs">{topicEntries.length} entries</span>
            </div>

            <div className="space-y-2">
              {topicEntries.map((entry) => {
                const isExpanded = expandedCid === entry.cid;
                return (
                  <div
                    key={entry.cid}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden hover:border-zinc-700 transition-colors"
                  >
                    <div className="px-4 py-3 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-1.5 py-0.5 rounded text-xs border ${topicClass(entry.keyvalues?.type || "general")}`}>
                            {entry.keyvalues?.type ?? "fact"}
                          </span>
                          <span className="text-xs text-zinc-600">
                            {new Date(entry.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {entry.doc?.title && (
                          <p className="text-sm font-medium text-zinc-200 truncate">{entry.doc.title}</p>
                        )}
                        <p className={`text-sm text-zinc-400 ${isExpanded ? "" : "line-clamp-2"}`}>
                          {entry.doc?.content ?? entry.name}
                        </p>
                        {entry.doc?.url && (
                          <a
                            href={entry.doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-violet-400 hover:text-violet-300 truncate block mt-1"
                          >
                            {entry.doc.url}
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setExpandedCid(isExpanded ? null : entry.cid)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                          title={isExpanded ? "Collapse" : "Expand"}
                        >
                          <svg className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <a
                          href={`${process.env.NEXT_PUBLIC_PINATA_GATEWAY ?? "https://gateway.pinata.cloud"}/ipfs/${entry.cid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-violet-400 hover:bg-zinc-800 transition-colors"
                          title="View on IPFS"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                        <button
                          onClick={() => handleDelete(entry.cid)}
                          disabled={deletingCid === entry.cid}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                          title="Delete entry"
                        >
                          {deletingCid === entry.cid ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-zinc-800 px-4 py-3 bg-zinc-900/80">
                        <p className="text-xs text-zinc-500 font-mono break-all">CID: {entry.cid}</p>
                        {entry.keyvalues?.source && (
                          <p className="text-xs text-zinc-500 mt-1">Source: {entry.keyvalues.source}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
