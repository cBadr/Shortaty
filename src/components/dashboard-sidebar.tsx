"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  Link2,
  BarChart3,
  Wallet,
  Send,
  KeySquare,
  Settings,
  FolderKanban,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { href: string; labelKey: keyof Messages; icon: React.ElementType };
type Messages = Record<
  "links" | "campaigns" | "analytics" | "wallet" | "telegram" | "apiKeys" | "settings" | "admin",
  string
>;

const items: Item[] = [
  { href: "/dashboard/links", labelKey: "links", icon: Link2 },
  { href: "/dashboard/campaigns", labelKey: "campaigns", icon: FolderKanban },
  { href: "/dashboard/analytics", labelKey: "analytics", icon: BarChart3 },
  { href: "/dashboard/wallet", labelKey: "wallet", icon: Wallet },
  { href: "/dashboard/telegram", labelKey: "telegram", icon: Send },
  { href: "/dashboard/api-keys", labelKey: "apiKeys", icon: KeySquare },
  { href: "/dashboard/settings", labelKey: "settings", icon: Settings },
];

export function DashboardSidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const t = useTranslations("Dashboard");

  return (
    <aside className="w-60 shrink-0 border-e border-border bg-card/40 min-h-[calc(100vh-60px)] py-6 px-3">
      <nav className="space-y-1">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm",
                active
                  ? "bg-brand-500/10 text-brand-600 font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="size-4" />
              <span>{t(item.labelKey)}</span>
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm mt-4 border-t border-border pt-4",
              pathname.startsWith("/admin")
                ? "bg-brand-500/10 text-brand-600 font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <ShieldCheck className="size-4" />
            <span>{t("admin")}</span>
          </Link>
        )}
      </nav>
    </aside>
  );
}
