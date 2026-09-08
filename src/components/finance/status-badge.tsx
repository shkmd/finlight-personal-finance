import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TONE_CLASSES: Record<string, string> = {
  GREEN: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  AMBER: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  RED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

export function BudgetStatusBadge({ status }: { status: "GREEN" | "AMBER" | "RED" }) {
  const label = status === "GREEN" ? "On track" : status === "AMBER" ? "Approaching limit" : "Over budget";
  return <Badge className={cn("border-0", TONE_CLASSES[status])}>{label}</Badge>;
}

export function SampleDataBadge() {
  return (
    <Badge variant="outline" className="border-dashed text-muted-foreground">
      Sample
    </Badge>
  );
}
