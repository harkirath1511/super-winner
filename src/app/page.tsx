import { isSupabaseConfigured } from "@/lib/supabase/client";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-4 px-6 py-16">
      <h1 className="text-3xl font-semibold">Next.js + TypeScript + Supabase</h1>
      <p className="text-zinc-600 dark:text-zinc-300">
        This project is initialized with Next.js (TypeScript) and includes a basic
        Supabase client setup.
      </p>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Supabase status:{" "}
        {isSupabaseConfigured
          ? "configured"
          : "missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables"}
      </p>
    </main>
  );
}
