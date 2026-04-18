"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useConnect, useDisconnect, useSignMessage } from "wagmi";
import { SiweMessage } from "siwe";
import { injected } from "wagmi/connectors";

type AuthState = "idle" | "connecting" | "signing" | "verifying" | "done" | "error";

export default function LandingPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { connectAsync } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  const [authState, setAuthState] = useState<AuthState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Check if already authenticated
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data: { authenticated: boolean; onboardingComplete?: boolean }) => {
        if (data.authenticated) {
          router.replace(data.onboardingComplete ? "/dashboard" : "/onboarding");
        }
      })
      .catch(() => {});
  }, [router]);

  const signIn = useCallback(async () => {
    try {
      setErrorMsg("");
      setAuthState("connecting");

      let currentAddress = address;
      if (!isConnected || !currentAddress) {
        const result = await connectAsync({ connector: injected() });
        currentAddress = result.accounts[0];
      }

      setAuthState("signing");

      // Get nonce from server
      const nonceRes = await fetch("/api/auth/nonce");
      const { nonce } = (await nonceRes.json()) as { nonce: string };

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
      const domain = new URL(appUrl).host;

      const siweMessage = new SiweMessage({
        domain,
        address: currentAddress,
        statement: "Sign in to LLM Twin - your identity stays anonymous.",
        uri: appUrl,
        version: "1",
        chainId: 1,
        nonce,
      });
      const message = siweMessage.prepareMessage();
      const signature = await signMessageAsync({ message });

      setAuthState("verifying");

      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, signature }),
      });

      if (!verifyRes.ok) {
        const err = (await verifyRes.json()) as { error: string };
        throw new Error(err.error);
      }

      const { onboardingComplete } = (await fetch("/api/auth/me").then((r) =>
        r.json()
      )) as { onboardingComplete: boolean };

      setAuthState("done");
      router.replace(onboardingComplete ? "/dashboard" : "/onboarding");
    } catch (e) {
      setAuthState("error");
      setErrorMsg(e instanceof Error ? e.message : "Sign-in failed");
    }
  }, [address, isConnected, connectAsync, signMessageAsync, router]);

  const stateLabel: Record<AuthState, string> = {
    idle: "Connect MetaMask",
    connecting: "Connecting wallet…",
    signing: "Sign the message in MetaMask…",
    verifying: "Verifying…",
    done: "Redirecting…",
    error: "Try again",
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-zinc-950">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-violet-900/20 blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 max-w-lg text-center">
        {/* Logo mark */}
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-500/30">
          <svg
            className="w-8 h-8 text-violet-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.698-1.538 2.698H4.336c-1.569 0-2.538-1.698-1.538-2.698L4.2 15.3"
            />
          </svg>
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-zinc-50 tracking-tight">
            LLM Twin
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Build a personal AI that answers surveys on your behalf — your
            identity stays <span className="text-violet-400 font-medium">completely anonymous</span>.
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2 justify-center">
          {[
            "🧠 Adaptive AI interviewer",
            "🔍 Web-enriched context",
            "🔗 IPFS knowledge base",
            "🦊 MetaMask sign-in",
          ].map((f) => (
            <span
              key={f}
              className="px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-sm text-zinc-300"
            >
              {f}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-3 w-full">
          <button
            onClick={signIn}
            disabled={authState === "connecting" || authState === "signing" || authState === "verifying" || authState === "done"}
            className="w-full max-w-xs flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 disabled:cursor-not-allowed text-white font-semibold transition-all duration-150 shadow-lg shadow-violet-900/40"
          >
            {(authState === "connecting" || authState === "signing" || authState === "verifying" || authState === "done") && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {stateLabel[authState]}
          </button>

          {errorMsg && (
            <p className="text-red-400 text-sm">{errorMsg}</p>
          )}

          {isConnected && address && authState === "idle" && (
            <p className="text-zinc-500 text-xs">
              Connected: {address.slice(0, 6)}…{address.slice(-4)}{" "}
              <button
                onClick={() => disconnect()}
                className="text-zinc-400 hover:text-zinc-200 underline"
              >
                Disconnect
              </button>
            </p>
          )}
        </div>

        <p className="text-zinc-600 text-xs max-w-xs">
          No email. No password. Your wallet address is your pseudonymous
          identity — we never store your real name.
        </p>
      </div>
    </main>
  );
}
