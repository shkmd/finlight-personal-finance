"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { generateSampleData, clearSampleData } from "@/lib/actions/sampleData";
import { Button } from "@/components/ui/button";

export function SampleDataBanner({ hasSampleData }: { hasSampleData: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  if (hasSampleData) {
    return (
      <div className="flex flex-wrap items-center gap-4 rounded-[18px] border border-(--fl-mint) bg-(--fl-mint-soft) p-[16px_20px]">
        <div className="min-w-0 flex-[1_1_300px]">
          <div className="text-[15px] font-extrabold tracking-tight">You&apos;re viewing sample data</div>
          <div className="mt-0.5 text-[13px] font-medium text-(--fl-muted)">
            Sample records are clearly labelled and kept separate from your real data.
          </div>
        </div>
        <Button
          disabled={isPending}
          variant="outline"
          className="rounded-full border-(--fl-line) bg-white"
          onClick={() =>
            startTransition(async () => {
              const result = await clearSampleData();
              if (!result.success) toast.error(result.error);
              else {
                toast.success("Sample data cleared");
                router.refresh();
              }
            })
          }
        >
          Clear sample data
        </Button>
      </div>
    );
  }

  if (dismissed) return null;

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-[18px] border border-(--fl-mint) bg-(--fl-mint-soft) p-[16px_20px]">
      <div className="min-w-0 flex-[1_1_300px]">
        <div className="text-[15px] font-extrabold tracking-tight">New here?</div>
        <div className="mt-0.5 text-[13px] font-medium text-(--fl-muted)">
          Load sample data to see how the dashboard, budget and debt planner work together.
        </div>
      </div>
      <Button
        disabled={isPending}
        className="rounded-full bg-(--fl-green) hover:bg-(--fl-green-dark)"
        onClick={() =>
          startTransition(async () => {
            const result = await generateSampleData();
            if (!result.success) toast.error(result.error);
            else {
              toast.success("Sample data added");
              router.refresh();
            }
          })
        }
      >
        Use sample data
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
        Dismiss
      </Button>
    </div>
  );
}
