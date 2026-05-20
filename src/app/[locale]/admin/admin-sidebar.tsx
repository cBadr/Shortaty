"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { Globe, Users, DollarSign, Settings2, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin/domains", label: "Domains", icon: Globe },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/transactions", label: "Transactions", icon: DollarSign },
  { href: "/admin/settings", label: "System", icon: Settings2 },
  { href: "/admin/audit", label: "Audit log", icon: Activity },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-60 shrink-0 border-e border-border bg-card/40 min-h-[calc(100vh-60px)] py-6 px-3">
      <div className="px-3 mb-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Admin
      </div>
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
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
