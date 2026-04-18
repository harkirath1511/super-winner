import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: "LLM Twin",
  description: "Friendly, tap-first onboarding for your anonymous survey twin.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased ${nunito.variable}`}>
      <body
        className={`min-h-full flex flex-col font-sans ${nunito.className} selection:bg-black selection:text-[#FFD93D]`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
