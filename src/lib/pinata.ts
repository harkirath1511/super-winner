const PINATA_API = "https://api.pinata.cloud";
const PINATA_JWT = () => process.env.PINATA_JWT ?? "";

export interface KbKeyvalues {
  wallet: string;
  type: "profile" | "fact" | "preference" | "link" | "session";
  topic: string;
  source: "user" | "tavily" | "url-extract";
}

export interface PinataEntry {
  cid: string;
  name: string;
  size: number;
  createdAt: string;
  keyvalues: KbKeyvalues;
}

export interface KbDocument {
  content: string;
  title?: string;
  url?: string;
  savedAt: string;
}

// Pin arbitrary JSON to IPFS and return the resulting CID.
export async function pinJson(
  data: KbDocument,
  keyvalues: KbKeyvalues,
  name?: string
): Promise<string> {
  const slug = name ?? `${keyvalues.type}:${keyvalues.topic}:${Date.now()}`;
  const body = {
    pinataContent: data,
    pinataMetadata: {
      name: slug,
      keyvalues,
    },
  };
  const res = await fetch(`${PINATA_API}/pinning/pinJSONToIPFS`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PINATA_JWT()}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pinata pin failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as { IpfsHash: string };
  return json.IpfsHash;
}

// List pins belonging to a wallet, optionally filtered by type/topic.
export async function listByWallet(
  wallet: string,
  filters?: { type?: string; topic?: string }
): Promise<PinataEntry[]> {
  const kv: Record<string, string> = { wallet };
  if (filters?.type) kv.type = filters.type;
  if (filters?.topic) kv.topic = filters.topic;

  const params = new URLSearchParams();
  params.set("status", "pinned");
  params.set(
    "metadata[keyvalues]",
    JSON.stringify(
      Object.fromEntries(
        Object.entries(kv).map(([k, v]) => [k, { value: v, op: "eq" }])
      )
    )
  );
  params.set("pageLimit", "1000");

  const res = await fetch(`${PINATA_API}/data/pinList?${params}`, {
    headers: { Authorization: `Bearer ${PINATA_JWT()}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pinata list failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as {
    rows: Array<{
      ipfs_pin_hash: string;
      metadata: {
        name: string;
        keyvalues: KbKeyvalues;
      };
      size: number;
      date_pinned: string;
    }>;
  };

  return json.rows.map((r) => ({
    cid: r.ipfs_pin_hash,
    name: r.metadata?.name ?? "",
    size: r.size,
    createdAt: r.date_pinned,
    keyvalues: r.metadata?.keyvalues ?? ({} as KbKeyvalues),
  }));
}

// Fetch and return the JSON content of a pinned CID via the gateway.
export async function getJson(cid: string): Promise<KbDocument> {
  const gateway = process.env.PINATA_GATEWAY ?? "https://gateway.pinata.cloud";
  const res = await fetch(`${gateway}/ipfs/${cid}`, {
    headers: { Authorization: `Bearer ${PINATA_JWT()}` },
  });
  if (!res.ok) throw new Error(`Pinata get failed: ${res.status}`);
  return res.json() as Promise<KbDocument>;
}

// Unpin a CID.
export async function unpin(cid: string): Promise<void> {
  const res = await fetch(`${PINATA_API}/pinning/unpin/${cid}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${PINATA_JWT()}` },
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`Pinata unpin failed: ${res.status} ${text}`);
  }
}

// Pin new content then unpin the old CID. Returns the new CID.
export async function updateJson(
  oldCid: string,
  newData: KbDocument,
  keyvalues: KbKeyvalues,
  name?: string
): Promise<string> {
  const newCid = await pinJson(newData, keyvalues, name);
  await unpin(oldCid);
  return newCid;
}
