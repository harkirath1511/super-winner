"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useConnect, useDisconnect, useSignMessage } from "wagmi";
import { SiweMessage } from "siwe";
import { injected } from "wagmi/connectors";
import { NeoBtn, NeoPanel, MarqueeBar } from "./onboarding/_components/neo-ui";

type AuthState = "idle" | "connecting" | "signing" | "verifying" | "done" | "error";

const DEMO_BOT =
  "https://api.dicebear.com/7.x/bottts/svg?seed=BuddyTwin&backgroundType=solid&backgroundColor=FFD93D";
const DEMO_USER = "https://api.dicebear.com/7.x/avataaars/svg?seed=Explorer";

export default function LandingPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { connectAsync } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  const [authState, setAuthState] = useState<AuthState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

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

  const busy =
    authState === "connecting" ||
    authState === "signing" ||
    authState === "verifying" ||
    authState === "done";

  const label =
    authState === "connecting"
      ? "Connecting wallet"
      : authState === "signing"
        ? "Sign in MetaMask"
        : authState === "verifying"
          ? "Verifying"
          : authState === "done"
            ? "Redirecting"
            : authState === "error"
              ? "Try again"
              : "Enter with MetaMask";

  return (
    <div className="min-h-screen av-page overflow-x-hidden">
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 py-4 pointer-events-none">
        <div className="max-w-6xl mx-auto flex justify-between items-center pointer-events-auto">
          <div className="flex items-center gap-3 av-pop rounded-2xl bg-white px-5 py-2.5">
            <div className="rounded-xl border-[3px] border-black bg-[#FF6B6B] p-2 text-white text-lg leading-none">
              ✦
            </div>
            <span className="text-xl sm:text-2xl font-black tracking-tight">LLM Twin</span>
          </div>
          <NeoBtn variant="blue" className="text-sm py-2.5 px-4" onClick={signIn} disabled={busy}>
            {busy ? "Wait..." : "Launch"}
          </NeoBtn>
        </div>
      </nav>

      <header className="relative pt-28 sm:pt-36 pb-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="space-y-6 relative z-10">
            <div className="inline-block av-pop rounded-full bg-[#A29BFE] px-5 py-2 -rotate-2">
              <span className="font-black text-white uppercase text-sm tracking-wide">Tap-first AI twin</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-black leading-[0.95] tracking-tighter">
              A survey twin
              <br />
              for{" "}
              <span className="text-[#4D96FF] underline decoration-4 decoration-black underline-offset-4">
                every wallet.
              </span>
            </h1>

            <p className="text-lg sm:text-xl font-bold text-black/70 max-w-lg">
              Buttons, chips, and quick saves. Your wallet is your ID. Facts land on IPFS. No essays required.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <NeoBtn variant="lime" className="w-full sm:w-auto text-base py-4 px-8" onClick={signIn} disabled={busy}>
                {busy ? `${label}...` : label}
              </NeoBtn>
              <NeoBtn variant="outline" className="w-full sm:w-auto text-base py-4 px-8" onClick={signIn} disabled={busy}>
                I already use MetaMask
              </NeoBtn>
            </div>

            {errorMsg && (
              <NeoPanel tone="hot" className="p-4 text-sm font-bold">
                {errorMsg}
              </NeoPanel>
            )}

            {isConnected && address && authState === "idle" && (
              <p className="text-sm font-bold text-neutral-600">
                Linked {address.slice(0, 6)}...{address.slice(-4)}{" "}
                <button type="button" onClick={() => disconnect()} className="underline decoration-2 underline-offset-2">
                  Disconnect
                </button>
              </p>
            )}

            <div className="flex items-center gap-4 pt-4">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-11 h-11 rounded-full border-[3px] border-black bg-gray-200 overflow-hidden shadow-[2px_2px_0_0_#000]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i * 17}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
              <p className="font-bold text-sm sm:text-base leading-tight">
                Anonymous
                <br />
                by design
              </p>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <NeoPanel className="relative z-10 p-6 rounded-[36px] overflow-hidden rotate-1" largeShadow>
              <div className="flex items-center gap-3 mb-5 border-b-[3px] border-black pb-4">
                <span className="w-4 h-4 rounded-full border-2 border-black bg-[#FF6B6B]" />
                <span className="w-4 h-4 rounded-full border-2 border-black bg-[#FFD93D]" />
                <span className="w-4 h-4 rounded-full border-2 border-black bg-[#6BCB77]" />
                <span className="ml-auto rounded-full border-2 border-black bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-500">
                  twin.app
                </span>
              </div>

              <div className="space-y-5">
                <div className="flex gap-3 items-end">
                  <div className="w-14 h-14 rounded-2xl border-[3px] border-black overflow-hidden bg-[#FFD93D] shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={DEMO_BOT} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="border-[3px] border-black bg-[#E0E0E0] p-4 rounded-2xl rounded-bl-none shadow-[3px_3px_0_0_#000]">
                    <p className="font-bold text-base">Ready to stamp your first fact?</p>
                  </div>
                </div>

                <div className="flex gap-3 items-end justify-end">
                  <div className="border-[3px] border-black bg-[#4D96FF] text-white p-4 rounded-2xl rounded-br-none shadow-[3px_3px_0_0_#000]">
                    <p className="font-bold text-base">Yes - let&apos;s go.</p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl border-[3px] border-black overflow-hidden bg-white shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={DEMO_USER} alt="" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>

              <div className="mt-6 bg-neutral-100 p-3 rounded-xl border-[3px] border-black flex justify-between items-center text-neutral-400 font-bold text-sm">
                <span>Type a message...</span>
                <span className="bg-[#6BCB77] text-white p-2 rounded-lg border-2 border-black text-xs">Go</span>
              </div>
            </NeoPanel>

            <div className="absolute -top-8 -right-6 w-full h-full max-w-md bg-[#FF6B6B] rounded-[36px] border-[4px] border-black -z-10 -rotate-3" aria-hidden />
          </div>
        </div>
      </header>

      <MarqueeBar text="SIWE • IPFS KB • TAVILY SEARCH • TAP UI • ZERO PII •" />

      <section className="py-16 sm:py-20 px-4 sm:px-6 av-polka-blue border-y-[3px] border-black">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 space-y-3">
            <div className="inline-block av-pop rounded-full bg-white px-5 py-2 -rotate-1 mx-auto">
              <h2 className="text-lg font-black text-black uppercase">Why it works</h2>
            </div>
            <h2
              className="text-3xl sm:text-5xl md:text-6xl font-black text-white uppercase leading-tight"
              style={{ WebkitTextStroke: "2px black", paintOrder: "stroke fill" }}
            >
              Designed for
              <br />
              fast capture
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Tap, don't type",
                body: "The agent throws buttons, A/B picks, and tag stamps so you never stare at a blank box.",
                tone: "yellow" as const,
                tilt: "-rotate-1",
              },
              {
                title: "Your KB, your chain ID",
                body: "Sign once with MetaMask. Facts pin to IPFS with topics you control.",
                tone: "white" as const,
                tilt: "rotate-1",
              },
              {
                title: "Web when needed",
                body: "Tavily-backed search and URL extract keep answers grounded without leaving the flow.",
                tone: "hot" as const,
                tilt: "-rotate-1",
              },
            ].map((card) => (
              <NeoPanel
                key={card.title}
                tone={card.tone}
                className={`p-6 sm:p-8 rounded-[28px] h-full flex flex-col gap-4 ${card.tilt}`}
                largeShadow
              >
                <h3 className="text-2xl font-black uppercase leading-none">{card.title}</h3>
                <p className="text-base font-bold text-black/70 leading-snug normal-case">{card.body}</p>
              </NeoPanel>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-[#FFD93D] relative overflow-hidden border-b-[3px] border-black">
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#000 2px, transparent 2px)",
            backgroundSize: "20px 20px",
          }}
          aria-hidden
        />
        <div className="max-w-3xl mx-auto text-center relative z-10 space-y-8">
          <h2 className="text-4xl sm:text-6xl font-black text-black leading-tight">
            Ready to meet
            <br />
            your twin?
          </h2>
          <NeoPanel className="p-6 sm:p-10 rounded-[32px] text-left space-y-4" largeShadow>
            <p className="text-lg font-bold text-neutral-700 normal-case">
              One sign-in, one onboarding run, then your dashboard lists every pinned row with filters and IPFS links.
            </p>
            <NeoBtn variant="blue" className="w-full text-lg py-4" onClick={signIn} disabled={busy}>
              {busy ? `${label}...` : "Start with MetaMask"}
            </NeoBtn>
          </NeoPanel>
        </div>
      </section>

      <footer className="bg-black text-white py-12 px-6 border-t-[6px] border-[#FF6B6B]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between gap-8">
          <div>
            <p className="text-2xl font-black">LLM Twin</p>
            <p className="text-sm font-bold text-neutral-400 mt-2 max-w-sm normal-case">
              Anonymous survey twin. Built for playful onboarding and serious IPFS receipts.
            </p>
          </div>
          <p className="text-sm font-bold text-neutral-500 self-end">2026</p>
        </div>
      </footer>
    </div>
  );
}
