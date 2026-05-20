import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractBearer, hashKey } from "@/lib/api-keys";

export interface ApiAuthContext {
  userId: string;
  keyId: string;
  scopes: string[];
}

export type ApiHandler = (
  request: NextRequest,
  ctx: ApiAuthContext,
  routeParams: Record<string, string>
) => Promise<Response>;

interface KeyRow {
  id: string;
  user_id: string;
  scopes: string[];
  expires_at: string | null;
  is_active: boolean;
}

export async function authenticateRequest(
  request: NextRequest
): Promise<{ ctx: ApiAuthContext } | { response: NextResponse }> {
  const token = extractBearer(request.headers.get("authorization"));
  if (!token) {
    return { response: NextResponse.json({ error: "Missing bearer token" }, { status: 401 }) };
  }
  const sb = createAdminClient();
  const hash = await hashKey(token);
  const { data } = await sb
    .from("api_keys")
    .select("id, user_id, scopes, expires_at, is_active")
    .eq("key_hash", hash)
    .maybeSingle();

  const key = data as KeyRow | null;
  if (!key || !key.is_active) {
    return { response: NextResponse.json({ error: "Invalid API key" }, { status: 401 }) };
  }
  if (key.expires_at && new Date(key.expires_at) < new Date()) {
    return { response: NextResponse.json({ error: "API key expired" }, { status: 401 }) };
  }

  // Async update of last_used_at (best effort)
  void sb.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", key.id);

  return {
    ctx: {
      userId: key.user_id,
      keyId: key.id,
      scopes: key.scopes || [],
    },
  };
}

export function requireScope(ctx: ApiAuthContext, scope: string): NextResponse | null {
  // Treat empty scopes array as wildcard for convenience
  if (ctx.scopes.length === 0) return null;
  if (ctx.scopes.includes("*") || ctx.scopes.includes(scope)) return null;
  return NextResponse.json({ error: `Missing scope: ${scope}` }, { status: 403 });
}

export function withApiAuth(scope: string, handler: ApiHandler) {
  return async (
    request: NextRequest,
    routeCtx: { params: Promise<Record<string, string>> }
  ): Promise<Response> => {
    const auth = await authenticateRequest(request);
    if ("response" in auth) return auth.response;
    const scopeErr = requireScope(auth.ctx, scope);
    if (scopeErr) return scopeErr;
    const params = routeCtx?.params ? await routeCtx.params : {};
    return handler(request, auth.ctx, params);
  };
}
