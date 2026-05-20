import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDomain, verifyDomain } from "@/lib/vercel/domains";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!process.env.VERCEL_API_TOKEN) {
    return NextResponse.json({ ok: true, skipped: "VERCEL_API_TOKEN not set" });
  }

  const sb = createAdminClient();
  const { data } = await sb
    .from("domains")
    .select("hostname")
    .in("status", ["pending", "verifying", "error"]);

  const hosts = (data ?? []) as { hostname: string }[];
  const results: Array<{ host: string; status?: string; error?: string }> = [];

  for (const { hostname } of hosts) {
    try {
      // First try a soft GET (no Vercel re-verify call), then verify if still not verified.
      let v = await getDomain(hostname);
      if (!v.verified) v = await verifyDomain(hostname);

      const newStatus = v.verified ? "active" : "verifying";
      await sb
        .from("domains")
        .update({ status: newStatus, dns_configured: v.verified })
        .eq("hostname", hostname);
      results.push({ host: hostname, status: newStatus });
    } catch (e) {
      const message = e instanceof Error ? e.message : "unknown";
      await sb.from("domains").update({ status: "error" }).eq("hostname", hostname);
      results.push({ host: hostname, error: message });
    }
  }

  return NextResponse.json({ ok: true, checked: results.length, results });
}
