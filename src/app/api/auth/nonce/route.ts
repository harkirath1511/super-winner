import { NextResponse } from "next/server";
import { createNonce } from "@/lib/siwe";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  const nonce = createNonce();
  session.nonce = nonce;
  await session.save();
  return NextResponse.json({ nonce });
}
