"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { NeoBtn, NeoPanel, NeoStrip } from "../onboarding/_components/neo-ui";
import { KbWebMap, type EntryWithDoc } from "./_components/KbWebMap";

const TOPIC_SKIN: Record<string, string> = {
  work: "bg-[#FFD93D]",
  hobbies: "bg-[#6BCB77]",
  media: "bg-[#A29BFE]",
  food: "bg-[#FF6B6B] text-white",
  values: "bg-black text-[#FFD93D]",
  technology: "bg-white",
  travel: "bg-[#FFF4E0]",
  general: "bg-neutral-200",
};

function topicSkin(topic: string): string {
  return TOPIC_SKIN[topic.toLowerCase()] ?? TOPIC_SKIN.general;
}

export default function DashboardPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<EntryWithDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [wallet, setWallet] = useState("");
  const [filterTopic, setFilterTopic] = useState<string>("");
  const [topicChips, setTopicChips] = useState<string[]>([]);
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
        setTopicChips(Array.from(new Set(e.map((x) => x.keyvalues?.topic).filter(Boolean) as string[])).sort());
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load");
        setLoading(false);
      });
  }, [router, fetchEntries]);

  useEffect(() => {
    if (filterTopic !== "" || entries.length === 0) return;
    setTopicChips((prev) => {
      const s = new Set([...prev, ...(entries.map((e) => e.keyvalues?.topic).filter(Boolean) as string[])]);
      return Array.from(s).sort();
    });
  }, [entries, filterTopic]);

  const handleFilterChange = async (topic: string) => {
    setFilterTopic(topic);
    setExpandedCid(null);
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
      if (expandedCid === cid) setExpandedCid(null);
    } catch {
      setError("Delete failed");
    } finally {
      setDeletingCid(null);
    }
  };

  const chips = topicChips.length > 0 ? topicChips : Array.from(new Set(entries.map((e) => e.keyvalues?.topic).filter(Boolean) as string[])).sort();

  const grouped: Record<string, EntryWithDoc[]> = {};
  for (const e of entries) {
    const t = e.keyvalues?.topic || "general";
    grouped[t] = grouped[t] ?? [];
    grouped[t].push(e);
  }

  const gatewayBase = process.env.NEXT_PUBLIC_PINATA_GATEWAY ?? "https://gateway.pinata.cloud";

  if (loading && entries.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center av-page">
        <NeoPanel tone="lime" className="px-6 py-4 animate-pulse">
          <span className="text-xs font-black tracking-[0.3em]">LOADING MAP</span>
        </NeoPanel>
      </div>
    );
  }

  return (
    <div className="min-h-screen av-page flex flex-col">
      <header className="shrink-0 z-20 border-b-[3px] border-black bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-2 shadow-[0_4px_0_0_#000]">
        <div className="flex items-center gap-2">
          <NeoPanel tone="ink" className="px-2 py-1 text-[0.55rem] font-black">
            MAP
          </NeoPanel>
          <div>
            <p className="text-[0.65rem] font-black tracking-widest">PIN CONSTELLATION</p>
            <p className="text-[0.55rem] font-bold opacity-70">
              {wallet.slice(0, 6)}...{wallet.slice(-4)} / {entries.length} nodes
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <NeoBtn variant="outline" className="text-[0.55rem] py-1.5 px-2" onClick={() => router.push("/onboarding")}>
            AGENT
          </NeoBtn>
          <NeoBtn
            variant="outline"
            className="text-[0.55rem] py-1.5 px-2"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.replace("/");
            }}
          >
            OUT
          </NeoBtn>
        </div>
      </header>

      <main className="flex-1 flex flex-col max-w-6xl w-full mx-auto px-3 sm:px-4 py-4 gap-4">
        {error && (
          <NeoPanel tone="hot" className="p-3 text-xs font-black uppercase shrink-0">
            {error}
          </NeoPanel>
        )}

        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="text-[0.55rem] font-black text-neutral-500 uppercase mr-1">Filter</span>
            <NeoBtn variant={filterTopic === "" ? "ink" : "outline"} className="text-[0.55rem] py-1.5" onClick={() => handleFilterChange("")}>
              ALL
            </NeoBtn>
            {chips.map((t) => (
              <NeoBtn
                key={t}
                variant={filterTopic === t ? "ink" : "lime"}
                className={`text-[0.55rem] py-1.5 ${filterTopic === t ? "" : topicSkin(t)}`}
                onClick={() => handleFilterChange(t)}
              >
                {t}
              </NeoBtn>
            ))}
          </div>
        )}

        {entries.length === 0 && !loading && (
          <NeoPanel className="max-w-lg mx-auto overflow-hidden text-center shrink-0">
            <NeoStrip>EMPTY SKY</NeoStrip>
            <div className="p-8 space-y-4">
              <p className="text-sm font-black uppercase">NO NODES YET</p>
              <p className="text-xs font-bold text-neutral-600 normal-case">Run onboarding so facts appear on the map.</p>
              <NeoBtn variant="lime" className="w-full" onClick={() => router.push("/onboarding")}>
                OPEN AGENT
              </NeoBtn>
            </div>
          </NeoPanel>
        )}

        {entries.length > 0 && (
          <div className="flex-1 min-h-0 relative">
            {loading && (
              <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#fff4e0]/80 backdrop-blur-[2px] rounded-[28px]">
                <NeoPanel tone="yellow" className="px-4 py-3 animate-pulse text-xs font-black uppercase">
                  Refreshing…
                </NeoPanel>
              </div>
            )}
            <KbWebMap
              grouped={grouped}
              topicSkin={topicSkin}
              expandedCid={expandedCid}
              setExpandedCid={setExpandedCid}
              deletingCid={deletingCid}
              onDelete={handleDelete}
              gatewayBase={gatewayBase}
            />
          </div>
        )}

        <p className="text-center text-[0.6rem] font-bold text-neutral-500 normal-case shrink-0 pb-2">
          Tap a node to open detail. Lines connect each topic hub to its pins.
        </p>
      </main>
    </div>
  );
}
