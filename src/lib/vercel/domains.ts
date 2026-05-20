/**
 * Wrapper around Vercel REST API for domain management.
 * Docs: https://vercel.com/docs/rest-api/reference/endpoints/projects/add-a-domain-to-a-project
 */

const VERCEL_BASE = "https://api.vercel.com";

interface VercelOpts {
  token: string;
  projectId: string;
  teamId?: string;
}

function envOpts(): VercelOpts {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) {
    throw new Error("VERCEL_API_TOKEN and VERCEL_PROJECT_ID must be set");
  }
  return { token, projectId, teamId: process.env.VERCEL_TEAM_ID };
}

function teamQuery(opts: VercelOpts): string {
  return opts.teamId ? `?teamId=${encodeURIComponent(opts.teamId)}` : "";
}

async function vercelFetch<T>(
  path: string,
  init: RequestInit,
  opts: VercelOpts
): Promise<T> {
  const res = await fetch(`${VERCEL_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${opts.token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  const data: { error?: { message?: string } } & Record<string, unknown> = text
    ? JSON.parse(text)
    : {};
  if (!res.ok) {
    const message = data.error?.message || `Vercel API ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

export interface VercelDomain {
  name: string;
  verified: boolean;
  verification?: Array<{ type: string; domain: string; value: string; reason: string }>;
  apexName?: string;
  projectId?: string;
}

export async function addDomain(hostname: string): Promise<VercelDomain> {
  const opts = envOpts();
  const data = await vercelFetch<VercelDomain>(
    `/v10/projects/${opts.projectId}/domains${teamQuery(opts)}`,
    {
      method: "POST",
      body: JSON.stringify({ name: hostname }),
    },
    opts
  );
  return data;
}

export async function getDomain(hostname: string): Promise<VercelDomain> {
  const opts = envOpts();
  return vercelFetch<VercelDomain>(
    `/v9/projects/${opts.projectId}/domains/${encodeURIComponent(hostname)}${teamQuery(opts)}`,
    { method: "GET" },
    opts
  );
}

export async function verifyDomain(hostname: string): Promise<VercelDomain> {
  const opts = envOpts();
  return vercelFetch<VercelDomain>(
    `/v9/projects/${opts.projectId}/domains/${encodeURIComponent(hostname)}/verify${teamQuery(opts)}`,
    { method: "POST" },
    opts
  );
}

export async function removeDomain(hostname: string): Promise<void> {
  const opts = envOpts();
  await vercelFetch(
    `/v9/projects/${opts.projectId}/domains/${encodeURIComponent(hostname)}${teamQuery(opts)}`,
    { method: "DELETE" },
    opts
  );
}

export interface DnsInstructions {
  type: "A" | "CNAME" | "TXT";
  name: string;
  value: string;
  reason?: string;
}

/**
 * Friendly DNS instructions for the user, derived from a Vercel domain record.
 */
export function dnsInstructionsFor(d: VercelDomain): DnsInstructions[] {
  if (d.verification && d.verification.length) {
    return d.verification.map((v) => ({
      type: v.type as DnsInstructions["type"],
      name: v.domain,
      value: v.value,
      reason: v.reason,
    }));
  }
  // Fallback: standard apex + cname guidance
  const apex = d.apexName ?? d.name;
  if (d.name === apex) {
    return [{ type: "A", name: "@", value: "76.76.21.21" }];
  }
  return [
    {
      type: "CNAME",
      name: d.name.replace(`.${apex}`, ""),
      value: "cname.vercel-dns.com",
    },
  ];
}
