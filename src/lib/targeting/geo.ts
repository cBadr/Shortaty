import type { GeoInfo } from "./types";

/**
 * Extract geo info from Vercel-injected request headers.
 * See: https://vercel.com/docs/edge-network/headers#x-vercel-ip-country
 */
export function parseGeo(headers: Headers): GeoInfo {
  const country = headers.get("x-vercel-ip-country");
  const region = headers.get("x-vercel-ip-country-region");
  const city = headers.get("x-vercel-ip-city");
  const timezone = headers.get("x-vercel-ip-timezone");
  const ip =
    headers.get("x-real-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    null;

  return {
    country: country || null,
    region: region || null,
    city: city ? decodeURIComponent(city) : null,
    timezone: timezone || null,
    ip,
  };
}

export function parseLanguage(headers: Headers): string | null {
  const al = headers.get("accept-language");
  if (!al) return null;
  // Pick the highest-quality entry's primary tag, e.g. "ar-EG,ar;q=0.9,en-US;q=0.8" -> "ar"
  const first = al.split(",")[0]?.split(";")[0]?.trim();
  if (!first) return null;
  return first.split("-")[0].toLowerCase();
}
