import createIntlMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

const PRIMARY_HOST = (process.env.NEXT_PUBLIC_APP_URL || "")
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const pathname = request.nextUrl.pathname;

  const isPrimaryHost =
    !PRIMARY_HOST ||
    host === PRIMARY_HOST ||
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.endsWith(".vercel.app");

  if (!isPrimaryHost) {
    const slug = pathname.replace(/^\//, "").split("/")[0];
    if (slug && !slug.startsWith("_") && !slug.startsWith("api")) {
      const url = request.nextUrl.clone();
      url.pathname = `/api/r/${slug}`;
      url.searchParams.set("__host", host);
      return NextResponse.rewrite(url);
    }
    return NextResponse.redirect(new URL(`https://${PRIMARY_HOST}`));
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};
