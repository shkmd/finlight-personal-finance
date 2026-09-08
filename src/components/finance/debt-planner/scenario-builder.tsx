"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Loan } from "@prisma/client";

import { formatCurrency } from "@/lib/money";
import { formatDateOnly } from "@/lib/dates";
import { runPayoffScenario, savePayoffScenario } from "@/lib/actions/payoffScenarios";
import type { PayoffRunResult } from "@/lib/actions/payoffScenarios";
import { MoneyLineChart } from "@/components/finance/charts/money-line-chart";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowDown, ArrowUp, Sparkles } from "lucide-react";
import { StatCard } from "@/components/finance/stat-card";

type Strategy = "AVALANCHE" | "SNOWBALL" | "SHORTEST_TENURE" | "CUSTOM";

export function ScenarioBuilder({ loans, releasedSipMinor }: { loans: Loan[]; releasedSipMinor: number }) {
  const [name, setName] = useState("My Payoff Plan");
  const [selectedIds, setSelectedIds] = useState<string[]>(loans.map((l) => l.id));
  const [strategy, setStrategy] = useState<Strategy>("AVALANCHE");
  const [customOrder, setCustomOrder] = useState<string[]>(loans.map((l) => l.id));
  const [extraMonthlyAmount, setExtraMonthlyAmount] = useState(0);
  const [includeReleasedSip, setIncludeReleasedSip] = useState(releasedSipMinor / 100);
  const [lumpSumAmount, setLumpSumAmount] = useState<number | undefined>(undefined);
  const [lumpSumMonthIndex, setLumpSumMonthIndex] = useState<number | undefined>(undefined);
  const [annualIncreasePercent, setAnnualIncreasePercent] = useState(0);
  const [planStartMonth, setPlanStartMonth] = useState(new Date().toISOString().slice(0, 10));
  const [minCashBuffer, setMinCashBuffer] = useState(0);
  const [result, setResult] = useState<PayoffRunResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loanById = useMemo(() => new Map(loans.map((l) => [l.id, l])), [loans]);

  function toggleLoan(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function moveCustom(id: string, direction: -1 | 1) {
    setCustomOrder((prev) => {
      const idx = prev.indexOf(id);
      const next = [...prev];
      const swapWith = idx + direction;
      if (swapWith < 0 || swapWith >= next.length) return prev;
      [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
      return next;
    });
  }

  function buildInput() {
    return {
      name,
      loanIds: selectedIds,
      strategy,
      customOrder: strategy === "CUSTOM" ? customOrder.filter((id) => selectedIds.includes(id)) : undefined,
      extraMonthlyAmount,
      includeReleasedSip,
      lumpSumAmount: lumpSumAmount || undefined,
      lumpSumMonthIndex: lumpSumMonthIndex || undefined,
      annualIncreasePercent,
      planStartMonth: new Date(planStartMonth),
      minCashBuffer,
    };
  }

  async function handleRun() {
    if (selectedIds.length === 0) {
      toast.error("Select at least one loan.");
      return;
    }
    setIsRunning(true);
    try {
      const res = await runPayoffScenario(buildInput());
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setResult(res.data);
    } finally {
      setIsRunning(false);
    }
  }

  async function handleSave() {
    if (!result) return;
    setIsSaving(true);
    try {
      const res = await savePayoffScenario(buildInput());
      if (!res.success) toast.error(res.error);
      else toast.success("Scenario saved");
    } finally {
      setIsSaving(false);
    }
  }

  const chartData = useMemo(() => {
    if (!result) return [];
    const months = Math.max(result.comparison.baseline.totalMonths, result.comparison.accelerated.totalMonths, 0);
    const rows: Array<Record<string, number | string>> = [];
    for (let m = 1; m <= months; m += Math.max(1, Math.floor(months / 24) || 1)) {
      const baselineBalance = result.comparison.baseline.schedule
        .filter((e) => e.monthIndex === m)
        .reduce((s, e) => s + e.closingBalanceMinor, 0);
      const acceleratedBalance = result.comparison.accelerated.schedule
        .filter((e) => e.monthIndex === m)
        .reduce((s, e) => s + e.closingBalanceMinor, 0);
      rows.push({ label: `M${m}`, Baseline: baselineBalance, Accelerated: acceleratedBalance });
    }
    return rows;
  }, [result]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Build a payoff scenario</CardTitle>
          <CardDescription>Compare an accelerated plan against making only minimum payments. All results are estimates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Scenario name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Strategy</Label>
              <Select value={strategy} onValueChange={(v) => setStrategy(v as Strategy)}>
                <SelectTrigger className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AVALANCHE">Avalanche — highest interest first</SelectItem>
                  <SelectItem value="SNOWBALL">Snowball — lowest balance first</SelectItem>
                  <SelectItem value="SHORTEST_TENURE">Shortest tenure first</SelectItem>
                  <SelectItem value="CUSTOM">Custom order</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Loans included</Label>
            <div className="space-y-2 rounded-md border p-3">
              {(strategy === "CUSTOM" ? customOrder : loans.map((l) => l.id)).map((id) => {
                const loan = loanById.get(id);
                if (!loan) return null;
                return (
                  <div key={id} className="flex items-center justify-between gap-2">
                    <label className="flex flex-1 items-center gap-2 text-sm">
                      <Checkbox checked={selectedIds.includes(id)} onCheckedChange={() => toggleLoan(id)} />
                      {loan.name} <span className="text-xs text-muted-foreground">({loan.annualInterestRatePercent}% · {formatCurrency(loan.currentOutstandingPrincipalMinor)})</span>
                    </label>
                    {strategy === "CUSTOM" ? (
                      <div className="flex gap-1">
                        <Button size="icon-sm" variant="ghost" onClick={() => moveCustom(id, -1)}>
                          <ArrowUp className="size-3.5" />
                        </Button>
                        <Button size="icon-sm" variant="ghost" onClick={() => moveCustom(id, 1)}>
                          <ArrowDown className="size-3.5" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Extra monthly payment</Label>
              <Input type="number" inputMode="decimal" value={extraMonthlyAmount} onChange={(e) => setExtraMonthlyAmount(Number(e.target.value))} className="mt-1.5" />
            </div>
            <div>
              <Label>Released SIP cash to include</Label>
              <Input type="number" inputMode="decimal" value={includeReleasedSip} onChange={(e) => setIncludeReleasedSip(Number(e.target.value))} className="mt-1.5" />
            </div>
            <div>
              <Label>Annual increase (%)</Label>
              <Input type="number" inputMode="decimal" value={annualIncreasePercent} onChange={(e) => setAnnualIncreasePercent(Number(e.target.value))} className="mt-1.5" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <Label>Lump sum amount</Label>
              <Input type="number" inputMode="decimal" value={lumpSumAmount ?? ""} onChange={(e) => setLumpSumAmount(e.target.value ? Number(e.target.value) : undefined)} className="mt-1.5" />
            </div>
            <div>
              <Label>Lump sum month #</Label>
              <Input type="number" min={1} value={lumpSumMonthIndex ?? ""} onChange={(e) => setLumpSumMonthIndex(e.target.value ? Number(e.target.value) : undefined)} className="mt-1.5" />
            </div>
            <div>
              <Label>Plan start month</Label>
              <Input type="date" value={planStartMonth} onChange={(e) => setPlanStartMonth(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Minimum cash buffer</Label>
              <Input type="number" inputMode="decimal" value={minCashBuffer} onChange={(e) => setMinCashBuffer(Number(e.target.value))} className="mt-1.5" />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleRun} disabled={isRunning}>
              <Sparkles className="mr-1.5 size-4" /> {isRunning ? "Running…" : "Run scenario"}
            </Button>
            {result ? (
              <Button variant="outline" onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving…" : "Save scenario"}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {result ? (
        <div className="space-y-4">
          <Alert>
            <AlertTitle>These are projections, not guarantees</AlertTitle>
            <AlertDescription>Figures assume rates, EMIs, and payments stay as entered. Actual results will vary.</AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Baseline debt-free date"
              value={result.comparison.baseline.debtFreeDate ? formatDateOnly(result.comparison.baseline.debtFreeDate) : "Never"}
            />
            <StatCard
              label="Accelerated debt-free date"
              value={result.comparison.accelerated.debtFreeDate ? formatDateOnly(result.comparison.accelerated.debtFreeDate) : "Never"}
              tone="positive"
            />
            <StatCard label="Months saved" value={`${result.comparison.monthsSaved}`} tone="positive" />
            <StatCard label="Interest saved (net)" value={formatCurrency(result.comparison.netInterestSavedMinor)} tone="positive" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Total remaining balance over time</CardTitle>
            </CardHeader>
            <CardContent>
              <MoneyLineChart
                data={chartData}
                lines={[
                  { key: "Baseline", label: "Minimum payments only", color: "#94a3b8" },
                  { key: "Accelerated", label: "Accelerated plan", color: "#16a34a" },
                ]}
                summary={`Total remaining loan balance over time. Baseline reaches zero in ${result.comparison.baseline.totalMonths} months; the accelerated plan reaches zero in ${result.comparison.accelerated.totalMonths} months.`}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payoff order</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2">
                {result.comparison.accelerated.loanClosures.map((closure, index) => (
                  <li key={closure.loanId} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                    <span>
                      {index + 1}. {result.loanNames[closure.loanId] ?? closure.name}
                    </span>
                    <span className="text-muted-foreground">
                      Closes {formatDateOnly(closure.closureDate)} · EMI released {formatCurrency(closure.emiReleasedMinor)}
                    </span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Baseline vs accelerated</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <p className="text-muted-foreground">Baseline interest</p>
                <p className="font-semibold">{formatCurrency(result.comparison.baseline.totalInterestMinor)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Accelerated interest</p>
                <p className="font-semibold">{formatCurrency(result.comparison.accelerated.totalInterestMinor)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total extra contributed</p>
                <p className="font-semibold">{formatCurrency(result.comparison.accelerated.totalExtraContributedMinor)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Prepayment/foreclosure charges</p>
                <p className="font-semibold">
                  {formatCurrency(result.comparison.accelerated.totalPrepaymentChargesMinor + result.comparison.accelerated.totalForeclosureChargesMinor)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
