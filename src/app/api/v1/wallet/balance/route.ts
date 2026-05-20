import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export const GET = withApiAuth("wallet:read", async (_request, ctx) => {
  const sb = createAdminClient();
  const { data } = await sb
    .from("profiles")
    .select("credits_balance")
    .eq("id", ctx.userId)
    .maybeSingle();
  const balance = (data as { credits_balance?: number } | null)?.credits_balance ?? 0;
  return NextResponse.json({ data: { balance } });
});
