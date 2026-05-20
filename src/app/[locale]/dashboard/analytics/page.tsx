import { setRequestLocale } from "next-intl/server";
import { TimeseriesChart } from "@/components/charts/timeseries";
import {
  getBreakdown,
  getRecentClicks,
  getTimeseries,
  getTotals,
  parseRange,
} from "@/lib/analytics/queries";
import { Link } from "@/i18n/navigation";

export default async function AnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const urlSp = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") urlSp.set(k, v);
  }

  const range = parseRange(urlSp);
  const days = parseInt(urlSp.get("days") || "7", 10) || 7;

  const [totals, timeseries, byCountry, byOs, byDevice, byBrowser, byReferrer, recent] =
    await Promise.all([
      getTotals(range),
      getTimeseries(range),
      getBreakdown(range, "country"),
      getBreakdown(range, "os"),
      getBreakdown(range, "device_type"),
      getBreakdown(range, "browser"),
      getBreakdown(range, "referrer_domain"),
      getRecentClicks(range, 30),
    ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="flex gap-1 bg-muted rounded-md p-1 text-sm">
          {[1, 7, 30, 90].map((d) => (
            <Link
              key={d}
              href={`/dashboard/analytics?days=${d}`}
              className={`px-3 py-1 rounded ${days === d ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
            >
              {d === 1 ? "24h" : `${d}d`}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total clicks" value={totals.total} />
        <StatCard label="Unique" value={totals.unique} />
        <StatCard label="Bots" value={totals.bots} />
        <StatCard label="Links" value={totals.links} />
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold mb-4">Clicks over time</h2>
        {timeseries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center">No data in this range yet.</p>
        ) : (
          <TimeseriesChart data={timeseries} />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BreakdownCard title="By country" rows={byCountry} />
        <BreakdownCard title="By OS" rows={byOs} />
        <BreakdownCard title="By device" rows={byDevice} />
        <BreakdownCard title="By browser" rows={byBrowser} />
        <BreakdownCard title="By referrer" rows={byReferrer} />
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Recent clicks</h2>
          <a
            href={`/api/analytics/export?days=${days}`}
            className="text-sm text-brand-500 hover:underline"
          >
            Export CSV
          </a>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No clicks yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase">
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-start">When</th>
                  <th className="px-3 py-2 text-start">Country</th>
                  <th className="px-3 py-2 text-start">OS</th>
                  <th className="px-3 py-2 text-start">Device</th>
                  <th className="px-3 py-2 text-start">Browser</th>
                  <th className="px-3 py-2 text-start">Referrer</th>
                  <th className="px-3 py-2 text-start">Bot</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((c) => {
                  const r = c as Record<string, unknown>;
                  return (
                    <tr key={r.id as string} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 whitespace-nowrap">
                        {new Date(r.clicked_at as string).toLocaleString(locale)}
                      </td>
                      <td className="px-3 py-2">{(r.country as string) || "—"}</td>
                      <td className="px-3 py-2">{(r.os as string) || "—"}</td>
                      <td className="px-3 py-2">{(r.device_type as string) || "—"}</td>
                      <td className="px-3 py-2">{(r.browser as string) || "—"}</td>
                      <td className="px-3 py-2 truncate max-w-[160px]">
                        {(r.referrer_domain as string) || "direct"}
                      </td>
                      <td className="px-3 py-2">{r.is_bot ? "🤖" : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
    </div>
  );
}

function BreakdownCard({
  title,
  rows,
}: {
  title: string;
  rows: { key: string; total: number; unique: number }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h2 className="font-semibold mb-3">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4">No data.</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.slice(0, 10).map((r) => (
            <li key={r.key} className="relative">
              <div
                className="absolute inset-y-0 start-0 bg-brand-500/10 rounded"
                style={{ width: `${(r.total / max) * 100}%` }}
              />
              <div className="relative flex justify-between text-xs py-1 px-2">
                <span className="font-medium">{r.key}</span>
                <span className="text-muted-foreground">
                  {r.total} <span className="opacity-50">/ {r.unique}</span>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
