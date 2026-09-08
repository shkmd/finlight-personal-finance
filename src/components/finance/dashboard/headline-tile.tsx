import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";

export interface HeadlineTileProps {
  label: string;
  value: string;
  pill?: string;
  sub?: string;
  variant?: "filled" | "plain";
  valueColor?: string;
  href?: string;
  compact?: boolean;
}

export function HeadlineTile({ label, value, pill, sub, variant = "plain", valueColor, href, compact }: HeadlineTileProps) {
  const filled = variant === "filled";

  return (
    <div
      className={cn(
        "min-w-0 rounded-[20px] border p-5",
        filled ? "border-(--fl-green-deep) bg-(--fl-green-deep) text-white" : "border-(--fl-line) bg-(--fl-card)"
      )}
    >
      <div className="flex items-start justify-between gap-2.5">
        <span className={cn("text-[13px] font-bold", filled ? "text-white" : "text-(--fl-muted)")}>{label}</span>
        {href ? (
          <Link
            href={href}
            className={cn(
              "grid size-[26px] shrink-0 place-items-center rounded-full border transition-colors",
              filled
                ? "border-white/45 text-white hover:bg-white/10"
                : "border-(--fl-line) text-(--fl-muted) hover:bg-(--fl-green)/10"
            )}
          >
            <ArrowUpRight className="size-3" strokeWidth={2.6} />
          </Link>
        ) : null}
      </div>
      <div
        className={cn("mt-4 font-extrabold tabular-nums tracking-tight", compact ? "text-[27px]" : "text-[30px]")}
        style={{ color: filled ? "#ffffff" : valueColor }}
      >
        {value}
      </div>
      {pill || sub ? (
        <div className="mt-2.5 flex items-center gap-1.5">
          {pill ? (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-bold",
                filled ? "bg-[rgba(191,228,207,0.22)] text-(--fl-mint)" : "bg-(--fl-mint-soft) text-(--fl-green-dark)"
              )}
            >
              {pill}
            </span>
          ) : null}
          {sub ? (
            <span className={cn("text-[11.5px] font-medium", filled ? "text-white/72" : "text-(--fl-muted)")}>{sub}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
