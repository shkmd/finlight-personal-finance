"use client";

import { toast } from "sonner";
import { setAlertPreference } from "@/lib/actions/alerts";
import type { listAlertPreferences } from "@/lib/actions/alerts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

export function AlertPreferencesManager({ items }: { items: Awaited<ReturnType<typeof listAlertPreferences>> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alerts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map(({ definition, preference }) => (
          <div key={definition.type} className="flex items-start justify-between gap-3 border-b pb-3 last:border-0 last:pb-0">
            <div>
              <p className="text-sm font-medium">{definition.label}</p>
              <p className="text-xs text-muted-foreground">{definition.description}</p>
            </div>
            <Switch
              checked={preference.isEnabled}
              onCheckedChange={async (checked) => {
                const result = await setAlertPreference(definition.type, checked);
                if (!result.success) toast.error(result.error);
              }}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
