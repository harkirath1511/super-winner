import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { verifySiwe } from "@/lib/siwe";

export async function POST(req: NextRequest) {
  const { message, signature } = (await req.json()) as {
    message: string;
    signature: string;
  };

  const session = await getSession();
  const nonce = session.nonce;

  if (!nonce) {
    return NextResponse.json({ error: "No nonce in session" }, { status: 400 });
  }

  const result = await verifySiwe(message, signature, nonce);
  if (!result.ok || !result.address) {
    return NextResponse.json(
      { error: result.error ?? "Verification failed" },
      { status: 401 }
    );
  }

  session.wallet = result.address;
  session.nonce = undefined;
  // Preserve onboardingComplete if this wallet has signed in before
  if (!session.onboardingComplete) {
    session.onboardingComplete = false;
  }
  await session.save();

  return NextResponse.json({ wallet: result.address });
}
