"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { NAV_GROUPS } from "@/lib/nav";
import { Menu, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

function readStoredCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("fl-sidebar-collapsed") === "1";
  } catch {
    return false;
  }
}

export function SidebarNav({
  debtFreeLabel,
  debtFreeSub,
}: {
  debtFreeLabel: string;
  debtFreeSub: string;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(readStoredCollapsed);

  function toggle() {
    setCollapsed((prev) => {
      try {
        window.localStorage.setItem("fl-sidebar-collapsed", prev ? "0" : "1");
      } catch {
        // ignore storage failures (private browsing, etc.)
      }
      return !prev;
    });
  }

  return (
    <aside
      className={cn(
        "sticky top-5 hidden h-[calc(100vh-40px)] shrink-0 flex-col gap-[22px] overflow-hidden rounded-l-[26px] border-r border-[var(--fl-line)] bg-(--fl-card) p-[22px_14px] transition-[width] duration-150 md:flex",
        collapsed ? "w-[76px]" : "w-[246px]"
      )}
    >
      <div className="flex items-center gap-2.5 px-2">
        <Button
          onClick={toggle}
          title="Collapse menu"
          size="icon"
          className="size-[34px] shrink-0 rounded-xl bg-[var(--fl-green)] text-white hover:bg-[var(--fl-green-dark)]"
        >
          <Menu className="size-[17px]" strokeWidth={2.2} />
        </Button>
        {!collapsed ? (
          <span className="flex items-center gap-1.5 text-[19px] font-extrabold tracking-tight">
            <Wallet className="size-4 text-[var(--fl-green)]" />
            Finlight
          </span>
        ) : null}
      </div>

      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          {!collapsed ? (
            <div className="px-2.5 pb-2 text-[10px] font-bold tracking-[0.14em] text-[var(--fl-muted)] uppercase">
              {group.label}
            </div>
          ) : null}
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center gap-[11px] rounded-xl px-3 py-2.5 text-[13.5px] font-semibold transition-colors hover:bg-[var(--fl-mint-soft)]",
                    isActive ? "bg-[var(--fl-mint-soft)] text-[var(--fl-green-dark)]" : "text-[var(--fl-ink)]"
                  )}
                >
                  <Icon className="size-[17px] shrink-0" strokeWidth={2} />
                  {!collapsed ? <span className="truncate">{item.label}</span> : null}
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      <div
        className={cn(
          "relative mt-auto overflow-hidden rounded-[18px] bg-[var(--fl-green-deep)] text-white",
          collapsed ? "p-2" : "p-[18px]"
        )}
      >
        <div className="absolute -top-[30px] -right-[30px] size-[110px] rounded-full bg-[rgba(191,228,207,0.14)]" />
        {!collapsed ? (
          <>
            <div className="text-[10px] font-bold tracking-[0.12em] text-[var(--fl-mint)] uppercase">
              Debt-free target
            </div>
            <div className="mt-2 text-[17px] leading-[1.25] font-extrabold tracking-tight">{debtFreeLabel}</div>
            <div className="mt-1 text-[11.5px] font-medium text-white/72">{debtFreeSub}</div>
            <Link
              href="/debt-planner"
              className="mt-3.5 block w-full rounded-full bg-[var(--fl-mint)] py-2.5 text-center text-[12px] font-extrabold text-[var(--fl-green-deep)] hover:bg-white"
            >
              Open planner
            </Link>
          </>
        ) : null}
      </div>
    </aside>
  );
}
