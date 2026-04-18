import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listByWallet, getJson, unpin } from "@/lib/pinata";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.wallet) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const topic = searchParams.get("topic") ?? undefined;
  const type = searchParams.get("type") ?? undefined;

  const entries = await listByWallet(session.wallet, {
    topic,
    type,
  });

  // Optionally enrich with content for the dashboard
  const withContent = searchParams.get("withContent") === "1";
  if (withContent) {
    const enriched = await Promise.all(
      entries.map(async (entry) => {
        try {
          const doc = await getJson(entry.cid);
          return { ...entry, doc };
        } catch {
          return { ...entry, doc: null };
        }
      })
    );
    return NextResponse.json({ entries: enriched });
  }

  return NextResponse.json({ entries });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session.wallet) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const cid = searchParams.get("cid");
  if (!cid) {
    return NextResponse.json({ error: "cid required" }, { status: 400 });
  }

  await unpin(cid);
  return NextResponse.json({ deleted: true });
}
