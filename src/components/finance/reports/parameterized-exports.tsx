"use client";

import { useState } from "react";
import { toast } from "sonner";

import { exportBudgetVsActualCsv, exportPayoffScheduleCsv } from "@/lib/actions/exports";
import { currentYearMonth } from "@/lib/dates";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function BudgetExportControl() {
  const current = currentYearMonth();
  const [year, setYear] = useState(current.year);
  const [month, setMonth] = useState(current.month);
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const csv = await exportBudgetVsActualCsv(year, month);
      downloadCsv(csv, `budget-vs-actual-${year}-${String(month).padStart(2, "0")}.csv`);
    } catch {
      toast.error("Export failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Budget vs actual report</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTH_NAMES.map((name, i) => (
              <SelectItem key={name} value={String(i + 1)}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[current.year - 1, current.year, current.year + 1].map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={loading}>
          <Download className="mr-1.5 size-4" /> {loading ? "Exporting…" : "Export CSV"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function ScenarioExportControl({ scenarios }: { scenarios: Array<{ id: string; name: string }> }) {
  const [scenarioId, setScenarioId] = useState(scenarios[0]?.id ?? "");
  const [loading, setLoading] = useState(false);

  if (scenarios.length === 0) return null;

  async function handleExport() {
    if (!scenarioId) return;
    setLoading(true);
    try {
      const csv = await exportPayoffScheduleCsv(scenarioId);
      downloadCsv(csv, `payoff-schedule-${scenarioId}.csv`);
    } catch {
      toast.error("Export failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Debt-payoff amortization schedule</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        <Select value={scenarioId} onValueChange={setScenarioId}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Select scenario" />
          </SelectTrigger>
          <SelectContent>
            {scenarios.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={loading}>
          <Download className="mr-1.5 size-4" /> {loading ? "Exporting…" : "Export CSV"}
        </Button>
      </CardContent>
    </Card>
  );
}
