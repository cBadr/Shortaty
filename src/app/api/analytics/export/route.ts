import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const COLUMNS = [
  "clicked_at",
  "link_id",
  "country",
  "region",
  "city",
  "os",
  "os_version",
  "browser",
  "browser_version",
  "device_type",
  "language",
  "referrer_domain",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "is_bot",
  "bot_name",
  "destination_url",
];

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get("days") || "30", 10) || 30;
  const linkId = url.searchParams.get("link");

  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  let linksQ = supabase.from("links").select("id").eq("user_id", user.id);
  if (linkId) linksQ = linksQ.eq("id", linkId);
  const { data: linkIdsData } = await linksQ;
  const linkIds = (linkIdsData ?? []).map((l) => (l as { id: string }).id);
  if (linkIds.length === 0) {
    return new NextResponse(COLUMNS.join(",") + "\n", {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="shortaty-export.csv"`,
      },
    });
  }

  const { data } = await supabase
    .from("clicks")
    .select(COLUMNS.join(","))
    .in("link_id", linkIds)
    .gte("clicked_at", from)
    .order("clicked_at", { ascending: false })
    .limit(50000);

  const rows = ((data ?? []) as unknown as Array<Record<string, unknown>>)
    .map((row) => COLUMNS.map((c) => csvEscape(row[c])).join(","))
    .join("\n");

  const csv = COLUMNS.join(",") + "\n" + rows + "\n";

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="shortaty-clicks-${days}d.csv"`,
    },
  });
}
