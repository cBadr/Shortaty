import { setRequestLocale } from "next-intl/server";

export default async function DocsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-4xl font-bold mb-4">API Documentation</h1>
      <p className="text-muted-foreground mb-10">
        Integrate Shortaty with your apps via the REST API. Generate a key from your dashboard.
      </p>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Authentication</h2>
        <p className="text-sm text-muted-foreground mb-3">
          Pass your API key as a bearer token in the <code className="font-mono">Authorization</code> header:
        </p>
        <pre className="bg-card border border-border rounded-lg p-4 text-sm font-mono overflow-x-auto">
{`Authorization: Bearer sk_live_xxxxxxxxxx`}
        </pre>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Create a link</h2>
        <pre className="bg-card border border-border rounded-lg p-4 text-sm font-mono overflow-x-auto">
{`POST /api/v1/links
Content-Type: application/json

{
  "destination_url": "https://example.com/long/path",
  "domain": "go.shortaty.com",        // or "domain_id"
  "slug": "promo",                    // optional, auto-generated if missing
  "title": "Summer promo",
  "redirect_type": 302,
  "expires_at": "2026-12-31T23:59:59Z",
  "max_clicks": 1000,
  "utm_source": "newsletter",
  "utm_medium": "email",
  "utm_campaign": "summer-2026"
}`}
        </pre>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">List links</h2>
        <pre className="bg-card border border-border rounded-lg p-4 text-sm font-mono overflow-x-auto">
{`GET /api/v1/links?limit=50`}
        </pre>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Get / update / delete a link</h2>
        <pre className="bg-card border border-border rounded-lg p-4 text-sm font-mono overflow-x-auto">
{`GET    /api/v1/links/{id}
PATCH  /api/v1/links/{id}      { "is_active": false }
DELETE /api/v1/links/{id}`}
        </pre>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Wallet balance</h2>
        <pre className="bg-card border border-border rounded-lg p-4 text-sm font-mono overflow-x-auto">
{`GET /api/v1/wallet/balance
→ { "data": { "balance": 12.345 } }`}
        </pre>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Scopes</h2>
        <p className="text-sm text-muted-foreground mb-3">
          When creating a key you can restrict its access:
        </p>
        <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
          <li><code className="font-mono">links:read</code> — list and fetch links</li>
          <li><code className="font-mono">links:write</code> — create, update, delete links</li>
          <li><code className="font-mono">analytics:read</code> — click data and exports</li>
          <li><code className="font-mono">wallet:read</code> — wallet balance</li>
        </ul>
        <p className="text-sm text-muted-foreground mt-3">
          Leave scopes empty to grant full access.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Errors</h2>
        <p className="text-sm text-muted-foreground">
          All errors return JSON: <code className="font-mono">{`{ "error": "message" }`}</code> with HTTP 400/401/403/404/500.
        </p>
      </section>
    </div>
  );
}
