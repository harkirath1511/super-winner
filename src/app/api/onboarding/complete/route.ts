import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

/** Mark onboarding done and go to dashboard (user-controlled exit). */
export async function POST() {
  const session = await getSession();
  if (!session.wallet) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  session.onboardingComplete = true;
  await session.save();
  return NextResponse.json({ ok: true });
}
