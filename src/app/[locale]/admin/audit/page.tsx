import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

interface AuditRow {
  id: number;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  created_at: string;
}

export default async function AdminAuditPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("id,user_id,action,resource_type,resource_id,metadata,ip,created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (data ?? []) as AuditRow[];

  const userIds = [...new Set(rows.map((r) => r.user_id).filter((v): v is string => !!v))];
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, email").in("id", userIds)
    : { data: [] as { id: string; email: string }[] };
  const emailMap = new Map(((profiles ?? []) as { id: string; email: string }[]).map((p) => [p.id, p.email]));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Audit log</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Last 200 entries. Audit entries are added by sensitive admin and API operations.
      </p>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase border-b border-border">
            <tr>
              <th className="px-4 py-2 text-start">When</th>
              <th className="px-4 py-2 text-start">User</th>
              <th className="px-4 py-2 text-start">Action</th>
              <th className="px-4 py-2 text-start">Resource</th>
              <th className="px-4 py-2 text-start">IP</th>
              <th className="px-4 py-2 text-start">Meta</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-muted-foreground">
                  No audit entries yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2 text-xs">
                    {r.user_id ? emailMap.get(r.user_id) || r.user_id.slice(0, 8) : "—"}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{r.action}</td>
                  <td className="px-4 py-2 text-xs">
                    {r.resource_type ? (
                      <>
                        <span className="text-muted-foreground">{r.resource_type}</span>
                        {r.resource_id ? <span className="font-mono"> / {r.resource_id.slice(0, 8)}</span> : null}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{r.ip ?? "—"}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground truncate max-w-[200px]">
                    {r.metadata ? JSON.stringify(r.metadata) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
