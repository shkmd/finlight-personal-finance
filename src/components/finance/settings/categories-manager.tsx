"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { archiveCategory, createCategory } from "@/lib/actions/categories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Archive } from "lucide-react";
import type { BudgetCategory } from "@prisma/client";

const GROUPS = ["ESSENTIAL", "DEBT", "INVESTMENT", "LIFESTYLE", "OTHER"];

export function CategoriesManager({ categories }: { categories: BudgetCategory[] }) {
  const [name, setName] = useState("");
  const [group, setGroup] = useState("LIFESTYLE");
  const router = useRouter();
  const [, startTransition] = useTransition();

  async function handleAdd() {
    if (!name.trim()) return;
    const result = await createCategory({ name, group: group as BudgetCategory["group"], color: "#6366f1" });
    if (!result.success) toast.error(result.error);
    else {
      toast.success("Category added");
      setName("");
      router.refresh();
    }
  }

  const grouped = GROUPS.map((g) => ({ group: g, items: categories.filter((c) => c.group === g) }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categories</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Input placeholder="New category name" value={name} onChange={(e) => setName(e.target.value)} className="w-48" />
          <Select value={group} onValueChange={setGroup}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GROUPS.map((g) => (
                <SelectItem key={g} value={g}>
                  {g.charAt(0) + g.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleAdd}>
            <Plus className="mr-1 size-4" /> Add
          </Button>
        </div>

        <div className="space-y-3">
          {grouped.map(({ group: g, items }) =>
            items.length ? (
              <div key={g}>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">{g.charAt(0) + g.slice(1).toLowerCase()}</p>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((c) => (
                    <Badge key={c.id} variant="outline" className="gap-1 pr-1">
                      <span className="size-2 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.name}
                      {c.isCustom ? (
                        <button
                          type="button"
                          className="ml-1 rounded p-0.5 hover:bg-muted"
                          onClick={() =>
                            startTransition(async () => {
                              const result = await archiveCategory(c.id, true);
                              if (!result.success) toast.error(result.error);
                              else router.refresh();
                            })
                          }
                        >
                          <Archive className="size-3" />
                        </button>
                      ) : null}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null
          )}
        </div>
      </CardContent>
    </Card>
  );
}
