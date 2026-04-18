"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { isToolUIPart, DefaultChatTransport, type DynamicToolUIPart } from "ai";
import { ToolPartRenderer } from "./_components/ChatTools";

interface AuthState {
  wallet: string;
  onboardingComplete: boolean;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check auth on mount
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

  const { messages, sendMessage, status, addToolResult } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Kick off with a greeting on first load
  const startedRef = useRef(false);
  useEffect(() => {
    if (auth && !startedRef.current && messages.length === 0) {
      startedRef.current = true;
      sendMessage({ text: "Hi, I'm ready to start." });
    }
  }, [auth, messages.length, sendMessage]);

  const [inputValue, setInputValue] = useState("");
  const isStreaming = status === "streaming" || status === "submitted";

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
      (addToolResult as any)({ tool: toolName, toolCallId, output: result });
    },
    [addToolResult]
  );

  if (loading || !auth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="flex items-center gap-3 text-zinc-400">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950">
      {/* Header */}
      <header className="shrink-0 border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
            <span className="text-violet-400 text-sm">🧠</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-100">LLM Twin — Onboarding</p>
            <p className="text-xs text-zinc-500">
              {auth.wallet.slice(0, 6)}…{auth.wallet.slice(-4)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-xs text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            Knowledge Base
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className="space-y-3">
              {msg.role === "user" && (
                <div className="flex justify-end">
                  <div className="max-w-md px-4 py-2.5 rounded-2xl rounded-tr-sm bg-violet-600 text-white text-sm">
                    {msg.parts
                      .filter((p) => p.type === "text")
                      .map((p, i) => (
                        <span key={i}>{p.text}</span>
                      ))}
                  </div>
                </div>
              )}

              {msg.role === "assistant" && (
                <div className="flex flex-col gap-3">
                  {msg.parts.map((part, i) => {
                    if (part.type === "text" && part.text) {
                      return (
                        <div key={i} className="flex items-start gap-2.5">
                          <div className="shrink-0 w-7 h-7 rounded-full bg-violet-700 flex items-center justify-center text-xs">
                            🧠
                          </div>
                          <div className="max-w-md px-4 py-2.5 rounded-2xl rounded-tl-sm bg-zinc-800 text-zinc-100 text-sm leading-relaxed">
                            {part.text}
                          </div>
                        </div>
                      );
                    }

                    if (isToolUIPart(part) && part.type === "dynamic-tool") {
                      return (
                        <div key={i} className="pl-9">
                          <ToolPartRenderer
                            part={part as DynamicToolUIPart}
                            onAddToolResult={handleAddToolResult}
                          />
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              )}
            </div>
          ))}

          {isStreaming && (
            <div className="flex items-center gap-2.5">
              <div className="shrink-0 w-7 h-7 rounded-full bg-violet-700 flex items-center justify-center text-xs">
                🧠
              </div>
              <div className="px-4 py-2.5 rounded-2xl rounded-tl-sm bg-zinc-800 text-zinc-400 text-sm flex items-center gap-2">
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-zinc-800 px-4 py-4">
        <div className="max-w-2xl mx-auto flex gap-3 items-end">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            placeholder={isStreaming ? "Agent is thinking…" : "Reply to the agent…"}
            className="flex-1 px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 focus:border-violet-500 focus:outline-none text-sm text-zinc-100 placeholder-zinc-500 disabled:opacity-50 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isStreaming}
            className="shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white transition-all"
          >
            <svg className="w-5 h-5 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-center text-xs text-zinc-600 mt-2">
          Your answers build your anonymous AI twin • Never shares your real identity
        </p>
      </div>
    </div>
  );
}
