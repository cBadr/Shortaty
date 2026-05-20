import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function assertCronAuth(request: NextRequest): NextResponse | null {
  const auth = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const unauthorized = assertCronAuth(request);
  if (unauthorized) return unauthorized;

  const sb = createAdminClient();
  const { data, error } = await sb.rpc("rollup_clicks_daily", {});

  if (error) {
    console.error("[cron rollup] error", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rows: data });
}
