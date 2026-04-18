"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import {
  isToolUIPart,
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { ToolPartRenderer } from "./_components/ChatTools";
import { NeoBtn, NeoPanel, BrowserChrome } from "./_components/neo-ui";
import { slicePartsForSequentialFlow } from "@/lib/ai/client-tools";

interface AuthState {
  wallet: string;
  onboardingComplete: boolean;
}

const BOT_AVATAR = "https://api.dicebear.com/7.x/bottts/svg?seed=TwinAgent";

function userAvatarUrl(wallet: string) {
  const seed = encodeURIComponent(wallet.slice(0, 16) || "guest");
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data: { authenticated: boolean; wallet?: string; onboardingComplete?: boolean }) => {
        if (!data.authenticated || !data.wallet) {
          router.replace("/");
          return;
        }
        if (data.onboardingComplete) {
          router.replace("/dashboard");
          return;
        }
        setAuth({ wallet: data.wallet, onboardingComplete: data.onboardingComplete ?? false });
        setLoading(false);
      })
      .catch(() => router.replace("/"));
  }, [router]);

  const { messages, sendMessage, status, addToolOutput } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    /** Without this, tool answers never POST back and the run stalls. */
    sendAutomaticallyWhen: ({ messages: m }) =>
      lastAssistantMessageIsCompleteWithToolCalls({ messages: m }) ||
      lastAssistantMessageIsCompleteWithApprovalResponses({ messages: m }),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startedRef = useRef(false);
  useEffect(() => {
    if (auth && !startedRef.current && messages.length === 0) {
      startedRef.current = true;
      sendMessage({ text: "BOOT SEQUENCE. GO AGGRESSIVE." });
    }
  }, [auth, messages.length, sendMessage]);

  const [inputValue, setInputValue] = useState("");
  const [exitBusy, setExitBusy] = useState(false);
  const isStreaming = status === "streaming" || status === "submitted";

  const finishToDashboard = useCallback(async () => {
    setExitBusy(true);
    try {
      const r = await fetch("/api/onboarding/complete", { method: "POST" });
      if (!r.ok) return;
      router.push("/dashboard");
    } finally {
      setExitBusy(false);
    }
  }, [router]);

  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text || isStreaming) return;
    setInputValue("");
    sendMessage({ text });
  }, [inputValue, isStreaming, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleAddToolResult = useCallback(
    (toolCallId: string, toolName: string, result: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (addToolOutput as any)({ tool: toolName, toolCallId, output: result });
    },
    [addToolOutput]
  );

  if (loading || !auth) {
    return (
      <div className="min-h-screen flex items-center justify-center av-page">
        <NeoPanel tone="yellow" className="px-8 py-5 animate-pulse">
          <span className="text-sm font-black tracking-[0.25em] uppercase">Loading twin</span>
        </NeoPanel>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen av-page">
      <nav className="shrink-0 z-30 px-4 py-4 border-b-[3px] border-black bg-white/90 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 av-pop rounded-2xl bg-white px-4 py-2">
            <div className="rounded-xl border-[3px] border-black bg-[#FF6B6B] p-1.5">
              <span className="text-lg leading-none" aria-hidden>
                ✦
              </span>
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-tight">Onboarding</p>
              <p className="text-[0.65rem] font-bold text-neutral-500">
                {auth.wallet.slice(0, 6)}...{auth.wallet.slice(-4)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <NeoBtn
              variant="lime"
              className="py-2 px-3 text-[0.65rem]"
              disabled={exitBusy}
              onClick={finishToDashboard}
            >
              {exitBusy ? "..." : "I'm done - dashboard"}
            </NeoBtn>
            <NeoBtn variant="outline" className="py-2 px-3 text-[0.65rem]" onClick={() => router.push("/dashboard")}>
              KB
            </NeoBtn>
            <NeoBtn
              variant="blue"
              className="py-2 px-3 text-[0.65rem]"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                router.replace("/");
              }}
            >
              Sign out
            </NeoBtn>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col min-h-0 p-4">
        <BrowserChrome title="twin.onboarding" className="flex-1 max-w-3xl w-full mx-auto min-h-0">
          <div className="flex-1 overflow-y-auto min-h-0 bg-[#faf8f5] px-3 py-4 sm:px-5">
            <div className="space-y-5 max-w-2xl mx-auto">
              {messages.map((msg) => (
                <div key={msg.id} className="space-y-4">
                  {msg.role === "user" && (
                    <div className="flex gap-3 items-end justify-end">
                      <div className="max-w-[85%] border-[3px] border-black bg-[#4D96FF] px-4 py-3 rounded-2xl rounded-br-none text-white shadow-[4px_4px_0_0_#000]">
                        <p className="text-sm font-bold leading-snug normal-case">
                          {msg.parts
                            .filter((p) => p.type === "text")
                            .map((p, i) => (
                              <span key={i}>{p.text}</span>
                            ))}
                        </p>
                      </div>
                      <div className="shrink-0 w-14 h-14 rounded-2xl border-[3px] border-black overflow-hidden bg-white shadow-[3px_3px_0_0_#000]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={userAvatarUrl(auth.wallet)} alt="" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}

                  {msg.role === "assistant" && (() => {
                    const { visible, queued } = slicePartsForSequentialFlow(msg.parts);
                    return (
                      <div className="flex flex-col gap-4">
                        {visible.map((part, i) => {
                          if (part.type === "text" && part.text?.trim()) {
                            return (
                              <div key={i} className="flex gap-3 items-end">
                                <div className="shrink-0 w-14 h-14 rounded-2xl border-[3px] border-black overflow-hidden bg-[#FFD93D] shadow-[3px_3px_0_0_#000]">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={BOT_AVATAR} alt="" className="w-full h-full object-cover scale-110" />
                                </div>
                                <div className="max-w-[85%] border-[3px] border-black bg-[#E0E0E0] px-4 py-3 rounded-2xl rounded-bl-none shadow-[4px_4px_0_0_#000]">
                                  <p className="text-sm font-bold leading-snug text-neutral-900 normal-case">
                                    {part.text}
                                  </p>
                                </div>
                              </div>
                            );
                          }

                          if (isToolUIPart(part)) {
                            return (
                              <div key={i} className="w-full pl-2 sm:pl-4">
                                <ToolPartRenderer part={part} onAddToolResult={handleAddToolResult} />
                              </div>
                            );
                          }

                          return null;
                        })}
                        {queued > 0 && (
                          <p className="text-[0.65rem] font-bold text-neutral-500 pl-2 sm:pl-14 normal-case">
                            {queued} more step{queued === 1 ? "" : "s"} unlock after you answer the card above.
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ))}

              {isStreaming && (
                <div className="flex gap-3 items-center">
                  <div className="shrink-0 w-10 h-10 rounded-xl border-[3px] border-black bg-[#A29BFE] flex items-center justify-center font-black text-sm">
                    ...
                  </div>
                  <div className="border-[3px] border-black bg-white px-4 py-2 rounded-2xl shadow-[3px_3px_0_0_#000] flex items-center gap-2">
                    <span className="inline-flex gap-1">
                      <span className="w-2 h-2 bg-[#4D96FF] rounded-sm animate-bounce [animation-delay:0ms]" />
                      <span className="w-2 h-2 bg-[#FFD93D] rounded-sm animate-bounce [animation-delay:120ms]" />
                      <span className="w-2 h-2 bg-[#FF6B6B] rounded-sm animate-bounce [animation-delay:240ms]" />
                    </span>
                    <span className="text-[0.65rem] font-black uppercase tracking-widest text-neutral-600">
                      Thinking
                    </span>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          <div className="shrink-0 border-t-[3px] border-black bg-white px-3 py-3 sm:px-4">
            <div className="max-w-2xl mx-auto flex gap-2 items-stretch">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isStreaming}
                placeholder={isStreaming ? "..." : "Type a message (optional)"}
                className="neo-input flex-1 px-3 py-3 text-sm font-bold placeholder:text-neutral-400 disabled:opacity-50"
              />
              <NeoBtn
                variant="lime"
                className="px-5 shrink-0"
                onClick={handleSend}
                disabled={!inputValue.trim() || isStreaming}
              >
                Send
              </NeoBtn>
            </div>
            <p className="text-center text-[0.6rem] font-black uppercase tracking-widest text-neutral-500 mt-2">
              One step at a time — finish the card to unlock the next (sometimes a short text question).
            </p>
          </div>
        </BrowserChrome>
      </main>
    </div>
  );
}
