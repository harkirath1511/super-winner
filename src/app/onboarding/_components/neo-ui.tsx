import type { ReactNode } from "react";

/** Thick border + hard shadow — matches avatar-ai Pop cards */
const ring = "border-[3px] border-black";

export function NeoPanel({
  children,
  tone = "cream",
  className = "",
  largeShadow,
}: {
  children: ReactNode;
  tone?:
    | "cream"
    | "lime"
    | "hot"
    | "aqua"
    | "ink"
    | "white"
    | "yellow"
    | "blue"
    | "green"
    | "red"
    | "purple";
  className?: string;
  /** Bigger drop shadow like hero chat card */
  largeShadow?: boolean;
}) {
  const legacy: Record<string, string> = {
    cream: "bg-white",
    lime: "bg-[#FFD93D]",
    hot: "bg-[#FF6B6B] text-white",
    aqua: "bg-[#6BCB77]",
    ink: "bg-black text-white shadow-[6px_6px_0_0_#FFD93D]",
    white: "bg-white",
    yellow: "bg-[#FFD93D]",
    blue: "bg-[#4D96FF] text-white",
    green: "bg-[#6BCB77]",
    red: "bg-[#FF6B6B] text-white",
    purple: "bg-[#A29BFE]",
  };
  const bg = legacy[tone] ?? legacy.cream;
  const sh =
    tone === "ink"
      ? ""
      : largeShadow
        ? "shadow-[12px_12px_0_0_#000]"
        : "shadow-[4px_4px_0_0_#000]";
  return (
    <div className={`${ring} rounded-2xl ${bg} ${sh} ${className}`}>{children}</div>
  );
}

export function NeoBtn({
  children,
  onClick,
  disabled,
  variant = "ink",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "ink" | "lime" | "outline" | "hot" | "blue" | "yellow";
  className?: string;
}) {
  const base =
    "av-btn-pop rounded-xl font-black uppercase tracking-wide text-xs sm:text-sm px-4 py-2.5";
  const v =
    variant === "lime" || variant === "yellow"
      ? "bg-[#FFD93D] text-black"
      : variant === "hot"
        ? "bg-[#FF6B6B] text-white"
        : variant === "blue"
          ? "bg-[#4D96FF] text-white"
        : variant === "outline"
          ? "bg-white text-black"
          : "bg-black text-white";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${v} disabled:opacity-40 disabled:pointer-events-none ${className}`}
    >
      {children}
    </button>
  );
}

/** Black bar + yellow star text (marquee-adjacent style) */
export function NeoStrip({ children }: { children: ReactNode }) {
  return (
    <div className="border-b-[3px] border-black bg-black text-[#FFD93D] px-3 py-2 text-[0.65rem] font-black uppercase tracking-widest flex items-center gap-2 rounded-t-[13px] -mt-[1px] -mx-[1px]">
      <span aria-hidden>★</span>
      {children}
    </div>
  );
}

/** Full-width scrolling marquee */
export function MarqueeBar({ text }: { text: string }) {
  const chunk = (
    <span className="text-lg sm:text-2xl font-black uppercase tracking-widest mx-8 text-white">
      {text}{" "}
      <span className="text-[#FFD93D]">★</span>
    </span>
  );
  return (
    <div className="border-y-[3px] border-black bg-black overflow-hidden py-3">
      <div className="av-marquee-track whitespace-nowrap">
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i}>{chunk}</span>
        ))}
      </div>
    </div>
  );
}

/** Fake browser window chrome */
export function BrowserChrome({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col min-h-0 rounded-[28px] border-[4px] border-black bg-white shadow-[12px_12px_0_0_#000] overflow-hidden ${className}`}
    >
      <div className="flex items-center gap-2 border-b-[3px] border-black px-4 py-3 bg-[#f5f5f5]">
        <span className="h-3 w-3 rounded-full border-2 border-black bg-[#FF6B6B]" />
        <span className="h-3 w-3 rounded-full border-2 border-black bg-[#FFD93D]" />
        <span className="h-3 w-3 rounded-full border-2 border-black bg-[#6BCB77]" />
        <span className="ml-auto rounded-full border-2 border-black bg-white px-3 py-0.5 text-[0.65rem] font-bold text-neutral-500">
          {title ?? "twin.app"}
        </span>
      </div>
      {children}
    </div>
  );
}
