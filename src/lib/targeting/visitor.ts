import { parseDevice } from "./device";
import { parseGeo, parseLanguage } from "./geo";
import { detectBot } from "./bot-detector";
import type { VisitorContext, UtmParams } from "./types";

function parseUtm(url: URL): UtmParams {
  return {
    source: url.searchParams.get("utm_source"),
    medium: url.searchParams.get("utm_medium"),
    campaign: url.searchParams.get("utm_campaign"),
    term: url.searchParams.get("utm_term"),
    content: url.searchParams.get("utm_content"),
  };
}

function refererDomain(ref: string | null): string | null {
  if (!ref) return null;
  try {
    return new URL(ref).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Cheap stable fingerprint using a few headers + IP hash.
 * NOT for anti-fraud — just to mark "unique visitor" within a window.
 */
async function fingerprint(parts: string[]): Promise<string> {
  const data = parts.join("|");
  const enc = new TextEncoder().encode(data);
  // Web Crypto is available in Edge runtime
  const hash = await crypto.subtle.digest("SHA-256", enc);
  const arr = Array.from(new Uint8Array(hash));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

export async function buildVisitorContext(
  request: Request,
  cookieVisitor?: string | null
): Promise<VisitorContext> {
  const url = new URL(request.url);
  const headers = request.headers;
  const userAgent = headers.get("user-agent") || "";

  const device = parseDevice(userAgent);
  const geo = parseGeo(headers);
  const bot = detectBot(userAgent);
  const utm = parseUtm(url);
  const referrer = headers.get("referer") || headers.get("referrer") || null;

  const fp = await fingerprint([
    geo.ip || "0",
    userAgent,
    headers.get("accept-language") || "",
  ]);

  const now = new Date();
  let hour = now.getUTCHours();
  let weekday = now.getUTCDay();
  if (geo.timezone) {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: geo.timezone,
        hour: "2-digit",
        weekday: "short",
        hour12: false,
      }).formatToParts(now);
      const h = parts.find((p) => p.type === "hour")?.value;
      if (h) hour = parseInt(h, 10) % 24;
      const wd = parts.find((p) => p.type === "weekday")?.value;
      const wdMap: Record<string, number> = {
        Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
      };
      if (wd && wd in wdMap) weekday = wdMap[wd];
    } catch {
      // ignore tz parsing errors
    }
  }

  return {
    device,
    geo,
    bot,
    utm,
    language: parseLanguage(headers),
    referrer,
    referrerDomain: refererDomain(referrer),
    isVpn: false, // detection requires external IP intelligence — Phase 8+
    isProxy: false,
    fingerprint: fp,
    visitorType: cookieVisitor ? "returning" : "new",
    hour,
    weekday,
  };
}
