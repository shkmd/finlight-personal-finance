"use client";

import { useRef, useState, useTransition } from "react";
import { signOut } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { generateSampleData, clearSampleData } from "@/lib/actions/sampleData";
import { currentYearMonth } from "@/lib/dates";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, Search, Settings, User as UserIcon } from "lucide-react";
import Link from "next/link";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function Topbar({
  userName,
  userEmail,
  currency,
  locale,
  hasSampleData,
}: {
  userName: string;
  userEmail: string;
  currency: string;
  locale: string;
  hasSampleData: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initials = userName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const monthAware = pathname === "/dashboard" || pathname === "/budget";
  const current = currentYearMonth();
  const year = monthAware ? Number(searchParams.get("year") ?? current.year) : current.year;
  const month = monthAware ? Number(searchParams.get("month") ?? current.month) : current.month;

  function stepMonth(delta: number) {
    if (!monthAware) return;
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    router.push(`${pathname}?year=${y}&month=${m}`);
  }

  function handleSearchChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      router.push(`/transactions?q=${encodeURIComponent(value)}`);
    }, 300);
  }

  return (
    <header className="flex flex-wrap items-center gap-3.5 border-b border-[var(--fl-line)] px-6 py-4">
      <label className="flex min-w-0 flex-1 basis-60 items-center gap-2.5 rounded-full bg-[var(--fl-fill)] px-4 py-2.5">
        <Search className="size-4 shrink-0 text-[var(--fl-muted)]" strokeWidth={2} />
        <input
          type="text"
          placeholder="Search transactions, loans, categories…"
          value={query}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="min-w-0 flex-1 border-0 bg-transparent text-[13px] font-medium text-[var(--fl-ink)] outline-none placeholder:text-[var(--fl-muted)]"
        />
      </label>

      <div className="flex items-center gap-1.5 rounded-full bg-[var(--fl-fill)] p-1">
        <button
          onClick={() => stepMonth(-1)}
          disabled={!monthAware}
          className="grid size-7 place-items-center rounded-full text-[15px] font-bold text-[var(--fl-ink)] hover:enabled:bg-white disabled:opacity-40"
        >
          ‹
        </button>
        <span className="min-w-[78px] text-center text-[12.5px] font-bold">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <button
          onClick={() => stepMonth(1)}
          disabled={!monthAware}
          className="grid size-7 place-items-center rounded-full text-[15px] font-bold text-[var(--fl-ink)] hover:enabled:bg-white disabled:opacity-40"
        >
          ›
        </button>
      </div>

      <div className="flex gap-1 rounded-full bg-[var(--fl-fill)] p-1">
        <button
          disabled={isPending}
          onClick={() =>
            !hasSampleData &&
            startTransition(async () => {
              const result = await generateSampleData();
              if (!result.success) toast.error(result.error);
              else {
                toast.success("Sample data added");
                router.refresh();
              }
            })
          }
          className="rounded-full px-3.5 py-1.5 text-[11.5px] font-bold"
          style={{ background: hasSampleData ? "#fff" : "transparent", color: hasSampleData ? "var(--fl-green-dark)" : "var(--fl-muted)" }}
        >
          Sample
        </button>
        <button
          disabled={isPending}
          onClick={() =>
            hasSampleData &&
            startTransition(async () => {
              const result = await clearSampleData();
              if (!result.success) toast.error(result.error);
              else {
                toast.success("Sample data cleared");
                router.refresh();
              }
            })
          }
          className="rounded-full px-3.5 py-1.5 text-[11.5px] font-bold"
          style={{ background: !hasSampleData ? "#fff" : "transparent", color: !hasSampleData ? "var(--fl-green-dark)" : "var(--fl-muted)" }}
        >
          Empty
        </button>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2.5 rounded-full">
            <Avatar className="size-[38px] bg-[var(--fl-green-dark)]">
              <AvatarFallback className="bg-[var(--fl-green-dark)] text-[12.5px] font-extrabold text-white">
                {initials || <UserIcon className="size-4" />}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-left sm:block">
              <span className="block text-[13px] leading-tight font-bold">{userName}</span>
              <span className="block text-[11px] font-medium text-[var(--fl-muted)]">
                {currency} · {locale}
              </span>
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <p className="truncate font-medium">{userName}</p>
            <p className="truncate text-xs font-normal text-muted-foreground">{userEmail}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings className="mr-2 size-4" /> Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
            <LogOut className="mr-2 size-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
