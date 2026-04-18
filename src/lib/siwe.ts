import { SiweMessage, generateNonce } from "siwe";

// In-memory nonce store — fine for single-instance dev/prod.
// Nonces expire after 5 minutes to prevent replay attacks.
const nonceStore = new Map<string, number>();
const NONCE_TTL_MS = 5 * 60 * 1000;

export function createNonce(): string {
  const nonce = generateNonce();
  nonceStore.set(nonce, Date.now());
  return nonce;
}

export function consumeNonce(nonce: string): boolean {
  const createdAt = nonceStore.get(nonce);
  if (!createdAt) return false;
  nonceStore.delete(nonce);
  if (Date.now() - createdAt > NONCE_TTL_MS) return false;
  return true;
}

export interface VerifyResult {
  ok: boolean;
  address?: string;
  error?: string;
}

export async function verifySiwe(
  message: string,
  signature: string,
  expectedNonce: string
): Promise<VerifyResult> {
  try {
    const siweMessage = new SiweMessage(message);
    const { data, success, error } = await siweMessage.verify({
      signature,
      nonce: expectedNonce,
    });
    if (!success || !data.address) {
      return { ok: false, error: error?.type ?? "verification failed" };
    }
    return { ok: true, address: data.address.toLowerCase() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown error" };
  }
}
