"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { generateSampleData, clearSampleData } from "@/lib/actions/sampleData";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export function SampleDataBanner({ hasSampleData }: { hasSampleData: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  if (hasSampleData) {
    return (
      <Alert className="mb-6 border-dashed">
        <Sparkles className="size-4" />
        <AlertTitle>You&apos;re viewing sample data</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
          <span>Sample records are clearly labelled and kept separate from your real data.</span>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
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
        </AlertDescription>
      </Alert>
    );
  }

  if (dismissed) return null;

  return (
    <Alert className="mb-6 border-dashed">
      <Sparkles className="size-4" />
      <AlertTitle>New here?</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
        <span>Load sample data to see how the dashboard, budget and debt planner work.</span>
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={isPending}
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
      </AlertDescription>
    </Alert>
  );
}
