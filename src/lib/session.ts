import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  wallet?: string;
  nonce?: string;
  onboardingComplete?: boolean;
}

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET ?? "change_me_fallback_secret_32chars!!",
  cookieName: "llm-twin-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
