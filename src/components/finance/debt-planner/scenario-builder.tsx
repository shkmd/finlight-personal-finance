"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Loan } from "@prisma/client";

import { formatCurrency, toMinorUnits } from "@/lib/money";
import { formatDateOnly } from "@/lib/dates";
import { savePayoffScenario } from "@/lib/actions/payoffScenarios";
import {
  simulateMinimumPaymentsBaseline,
  simulatePayoffPlan,
  comparePayoffPlans,
  type PayoffLoanInput,
  type PayoffSimulationResult,
  type PayoffStrategyKind,
} from "@/lib/finance/payoff";
import { HeadlineTile } from "@/components/finance/dashboard/headline-tile";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown, ArrowUp, ChevronDown } from "lucide-react";

const MAX_SLIDER = 30_000;

function toPayoffInput(l: Loan): PayoffLoanInput {
  return {
    loanId: l.id,
    name: l.name,
    balanceMinor: l.currentOutstandingPrincipalMinor,
    annualRatePercent: l.annualInterestRatePercent,
    emiMinor: l.currentEmiMinor,
    prepaymentChargePercent: l.prepaymentChargePercent,
    foreclosureChargePercent: l.foreclosureChargePercent,
  };
}

function balanceSeries(startTotal: number, result: PayoffSimulationResult): number[] {
  const months = result.totalMonths >= 0 ? result.totalMonths : Math.max(0, ...result.schedule.map((e) => e.monthIndex));
  const series = [startTotal];
  for (let m = 1; m <= months; m++) {
    series.push(result.schedule.filter((e) => e.monthIndex === m).reduce((s, e) => s + e.closingBalanceMinor, 0));
  }
  return series;
}

function toPoints(series: number[], maxV: number, maxM: number): string {
  return series.map((v, i) => `${((i / maxM) * 100).toFixed(2)},${(44 - (v / Math.max(1, maxV)) * 41).toFixed(2)}`).join(" ");
}

export function ScenarioBuilder({ loans, releasedSipMinor }: { loans: Loan[]; releasedSipMinor: number }) {
  const [selectedIds, setSelectedIds] = useState<string[]>(loans.map((l) => l.id));
  const [strategy, setStrategy] = useState<PayoffStrategyKind>("AVALANCHE");
  const [customOrder, setCustomOrder] = useState<string[]>(loans.map((l) => l.id));
  const [extraMonthly, setExtraMonthly] = useState(6000);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [includeReleasedSip, setIncludeReleasedSip] = useState(releasedSipMinor / 100);
  const [annualIncreasePercent, setAnnualIncreasePercent] = useState(0);
  const [lumpSumAmount, setLumpSumAmount] = useState<number | undefined>(undefined);
  const [lumpSumMonthIndex, setLumpSumMonthIndex] = useState<number | undefined>(undefined);
  const [minCashBuffer, setMinCashBuffer] = useState(0);
  const [scenarioName, setScenarioName] = useState("My Payoff Plan");
  const [isSaving, setIsSaving] = useState(false);

  const planStartMonth = useMemo(() => new Date(), []);
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

  const selectedLoans = loans.filter((l) => selectedIds.includes(l.id)).map(toPayoffInput);
  const totalSelectedEmiMinor = selectedLoans.reduce((s, l) => s + l.emiMinor, 0);
  const startTotalMinor = selectedLoans.reduce((s, l) => s + l.balanceMinor, 0);

  // Recomputed on every render rather than memoized: the simulation is a
  // handful of loans over at most a few hundred months, cheap enough to
  // re-run live on every slider tick, and it keeps this component free of
  // the manual-memoization pitfalls that come with a fast-changing,
  // multi-input live calculator like this one.
  const comparison =
    selectedLoans.length === 0
      ? null
      : comparePayoffPlans(
          simulateMinimumPaymentsBaseline(selectedLoans, planStartMonth),
          simulatePayoffPlan({
            loans: selectedLoans,
            strategy,
            customOrder: strategy === "CUSTOM" ? customOrder.filter((id) => selectedIds.includes(id)) : undefined,
            extraMonthlyAmountMinor: toMinorUnits(extraMonthly) + toMinorUnits(includeReleasedSip),
            annualIncreasePercent,
            lumpSumAmountMinor: lumpSumAmount ? toMinorUnits(lumpSumAmount) : undefined,
            lumpSumMonthIndex: lumpSumMonthIndex || undefined,
            planStartMonth,
          })
        );

  const orderSorted =
    strategy === "CUSTOM"
      ? customOrder.map((id) => loanById.get(id)).filter((l): l is Loan => !!l)
      : [...loans.filter((l) => selectedIds.includes(l.id))].sort((a, b) =>
          strategy === "SNOWBALL"
            ? a.currentOutstandingPrincipalMinor - b.currentOutstandingPrincipalMinor
            : b.annualInterestRatePercent - a.annualInterestRatePercent
        );
  const loanMax = Math.max(1, ...orderSorted.map((l) => l.currentOutstandingPrincipalMinor));

  async function handleSave() {
    if (!comparison) return;
    setIsSaving(true);
    try {
      const result = await savePayoffScenario({
        name: scenarioName,
        loanIds: selectedIds,
        strategy,
        customOrder: strategy === "CUSTOM" ? customOrder : undefined,
        extraMonthlyAmount: extraMonthly,
        includeReleasedSip,
        lumpSumAmount,
        lumpSumMonthIndex,
        annualIncreasePercent,
        planStartMonth,
        minCashBuffer,
      });
      if (!result.success) toast.error(result.error);
      else toast.success("Scenario saved");
    } finally {
      setIsSaving(false);
    }
  }

  const maxM = comparison ? Math.max(comparison.baseline.totalMonths, comparison.accelerated.totalMonths, 1) : 1;
  const basePoints = comparison ? toPoints(balanceSeries(startTotalMinor, comparison.baseline), startTotalMinor, maxM) : "0,44 100,44";
  const accPoints = comparison ? toPoints(balanceSeries(startTotalMinor, comparison.accelerated), startTotalMinor, maxM) : "0,44 100,44";

  const strategyNote =
    strategy === "AVALANCHE"
      ? "Highest interest rate first — cheapest in total interest paid."
      : strategy === "SNOWBALL"
        ? "Smallest balance first — closes accounts sooner, which keeps motivation up but costs more interest."
        : strategy === "SHORTEST_TENURE"
          ? "Shortest remaining tenure first."
          : "Your custom priority order.";

  if (loans.length === 0) return null;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <HeadlineTile
          variant="filled"
          compact
          label="Debt-free date"
          value={comparison?.accelerated.debtFreeDate ? formatDateOnly(comparison.accelerated.debtFreeDate, "MMM yyyy") : "—"}
          pill={comparison && comparison.accelerated.totalMonths >= 0 ? `${comparison.accelerated.totalMonths} months` : "—"}
          sub="At the current scenario"
        />
        <HeadlineTile
          compact
          label="Months saved"
          value={comparison ? `${comparison.monthsSaved}` : "—"}
          valueColor="var(--fl-green-dark)"
          sub="Versus minimum EMIs only"
        />
        <HeadlineTile
          compact
          label="Interest saved"
          value={comparison ? formatCurrency(comparison.netInterestSavedMinor) : "—"}
          valueColor="var(--fl-green-dark)"
          sub="Estimate over the full plan"
        />
        <HeadlineTile
          compact
          label="Total interest paid"
          value={comparison ? formatCurrency(comparison.accelerated.totalInterestMinor) : "—"}
          valueColor="var(--fl-red)"
          sub="On this plan"
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-3">
        <div className="min-w-0 rounded-[20px] border border-(--fl-line) bg-(--fl-card) p-5">
          <h2 className="text-[16px] font-extrabold tracking-tight">Scenario</h2>
          <div className="mt-3 text-xs font-semibold text-(--fl-muted)">Extra towards debt each month</div>
          <div className="mt-1 mb-0.5 text-[36px] font-extrabold tracking-tight text-(--fl-green-dark) tabular-nums">
            {formatCurrency(toMinorUnits(extraMonthly))}
          </div>
          <input
            type="range"
            min={0}
            max={MAX_SLIDER}
            step={500}
            value={extraMonthly}
            onChange={(e) => setExtraMonthly(Number(e.target.value))}
            className="my-3 w-full"
          />
          <div className="flex justify-between text-[11px] font-semibold text-(--fl-muted) tabular-nums">
            <span>₹0</span>
            <span>₹{MAX_SLIDER.toLocaleString("en-IN")}</span>
          </div>
          <div className="mt-3 text-xs font-medium text-(--fl-muted)">
            Total EMI across selected loans: {formatCurrency(totalSelectedEmiMinor)}
          </div>

          <div className="my-4.5 h-px bg-(--fl-line)" />

          <div className="mb-2 text-xs font-semibold text-(--fl-muted)">Payoff order</div>
          <div className="flex w-fit gap-1 rounded-full bg-(--fl-fill) p-1">
            <button
              onClick={() => setStrategy("AVALANCHE")}
              className="rounded-full px-4 py-2.25 text-xs font-bold"
              style={{ background: strategy === "AVALANCHE" ? "var(--fl-green)" : "transparent", color: strategy === "AVALANCHE" ? "#fff" : "var(--fl-ink)" }}
            >
              Avalanche
            </button>
            <button
              onClick={() => setStrategy("SNOWBALL")}
              className="rounded-full px-4 py-2.25 text-xs font-bold"
              style={{ background: strategy === "SNOWBALL" ? "var(--fl-green)" : "transparent", color: strategy === "SNOWBALL" ? "#fff" : "var(--fl-ink)" }}
            >
              Snowball
            </button>
          </div>
          <p className="mt-3 text-xs font-medium text-(--fl-muted)">{strategyNote}</p>

          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen} className="mt-4">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-1 text-xs font-bold text-(--fl-green-dark)">
                Advanced options
                <ChevronDown className={`size-3.5 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-(--fl-muted)">Scenario name</label>
                <Input value={scenarioName} onChange={(e) => setScenarioName(e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-(--fl-muted)">Loans included</label>
                <div className="space-y-1.5 rounded-xl border border-(--fl-line) p-2.5">
                  {(strategy === "CUSTOM" ? customOrder.map((id) => loanById.get(id)).filter((l): l is Loan => !!l) : loans).map((loan) => (
                    <div key={loan.id} className="flex items-center justify-between gap-2">
                      <label className="flex flex-1 items-center gap-2 text-sm">
                        <Checkbox checked={selectedIds.includes(loan.id)} onCheckedChange={() => toggleLoan(loan.id)} />
                        {loan.name}
                      </label>
                      {strategy === "CUSTOM" ? (
                        <div className="flex gap-1">
                          <Button size="icon-sm" variant="ghost" onClick={() => moveCustom(loan.id, -1)}>
                            <ArrowUp className="size-3.5" />
                          </Button>
                          <Button size="icon-sm" variant="ghost" onClick={() => moveCustom(loan.id, 1)}>
                            <ArrowDown className="size-3.5" />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-(--fl-muted)">Strategy</label>
                <Select value={strategy} onValueChange={(v) => setStrategy(v as PayoffStrategyKind)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AVALANCHE">Avalanche</SelectItem>
                    <SelectItem value="SNOWBALL">Snowball</SelectItem>
                    <SelectItem value="SHORTEST_TENURE">Shortest tenure first</SelectItem>
                    <SelectItem value="CUSTOM">Custom order</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-(--fl-muted)">Released SIP cash</label>
                  <Input type="number" value={includeReleasedSip} onChange={(e) => setIncludeReleasedSip(Number(e.target.value))} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-(--fl-muted)">Annual increase (%)</label>
                  <Input type="number" value={annualIncreasePercent} onChange={(e) => setAnnualIncreasePercent(Number(e.target.value))} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-(--fl-muted)">Lump sum amount</label>
                  <Input type="number" value={lumpSumAmount ?? ""} onChange={(e) => setLumpSumAmount(e.target.value ? Number(e.target.value) : undefined)} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-(--fl-muted)">Lump sum month #</label>
                  <Input type="number" min={1} value={lumpSumMonthIndex ?? ""} onChange={(e) => setLumpSumMonthIndex(e.target.value ? Number(e.target.value) : undefined)} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-(--fl-muted)">Minimum cash buffer</label>
                  <Input type="number" value={minCashBuffer} onChange={(e) => setMinCashBuffer(Number(e.target.value))} />
                </div>
              </div>
              <Button onClick={handleSave} disabled={isSaving || !comparison} className="w-full rounded-full bg-(--fl-green) hover:bg-(--fl-green-dark)">
                {isSaving ? "Saving…" : "Save this scenario"}
              </Button>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div className="min-w-0 rounded-[20px] border border-(--fl-line) bg-(--fl-card) p-5 lg:col-span-2">
          <h2 className="text-[16px] font-extrabold tracking-tight">Total balance over time</h2>
          <svg viewBox="0 0 100 46" preserveAspectRatio="none" className="mt-4 block h-[214px] w-full">
            <polyline points={basePoints} fill="none" stroke="#c8cfcb" strokeWidth="2" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
            <polyline points={accPoints} fill="none" stroke="var(--fl-green)" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="mt-2 flex justify-between text-[11.5px] font-semibold text-(--fl-muted)">
            <span>Today</span>
            <span>{comparison?.baseline.debtFreeDate ? formatDateOnly(comparison.baseline.debtFreeDate, "MMM yyyy") : "—"}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-4.5 text-[11.5px] font-bold">
            <span className="flex items-center gap-1.75">
              <span className="h-0.5 w-4.5 bg-[#c8cfcb]" />
              Minimum EMIs only
            </span>
            <span className="flex items-center gap-1.75">
              <span className="h-[3px] w-4.5 rounded bg-(--fl-green)" />
              With extra {formatCurrency(toMinorUnits(extraMonthly))}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-[20px] border border-(--fl-line) bg-(--fl-card) p-5">
        <h2 className="mb-3.5 text-[16px] font-extrabold tracking-tight">
          Loans — {strategy === "SNOWBALL" ? "smallest balance first" : strategy === "SHORTEST_TENURE" ? "shortest tenure first" : strategy === "CUSTOM" ? "custom order" : "highest rate first"}
        </h2>
        <div className="flex flex-col">
          {orderSorted.map((loan, i) => {
            const closure = comparison?.accelerated.loanClosures.find((c) => c.loanId === loan.id);
            return (
              <div key={loan.id} className="flex flex-wrap items-center gap-3.5 border-b border-(--fl-line) py-3.25 last:border-0">
                <div
                  className="grid size-[30px] shrink-0 place-items-center rounded-[10px] text-[12.5px] font-extrabold"
                  style={{ background: i === 0 ? "var(--fl-green)" : "var(--fl-fill)", color: i === 0 ? "#fff" : "var(--fl-muted)" }}
                >
                  {i + 1}
                </div>
                <div className="min-w-[200px] flex-[2_1_200px]">
                  <div className="text-[13.5px] font-bold">{loan.name}</div>
                  <div className="mt-1.75 h-1.75 max-w-[280px] overflow-hidden rounded-full bg-(--fl-track)">
                    <div
                      className="h-1.75 rounded-full"
                      style={{ width: `${(loan.currentOutstandingPrincipalMinor / loanMax) * 100}%`, background: i === 0 ? "var(--fl-green)" : "var(--fl-green-dark)" }}
                    />
                  </div>
                </div>
                <div className="min-w-24 flex-none text-right">
                  <div className="text-[10.5px] font-semibold text-(--fl-muted)">Outstanding</div>
                  <div className="text-[13.5px] font-extrabold tabular-nums">{formatCurrency(loan.currentOutstandingPrincipalMinor)}</div>
                </div>
                <div className="min-w-[62px] flex-none text-right">
                  <div className="text-[10.5px] font-semibold text-(--fl-muted)">Rate</div>
                  <div className="text-[13.5px] font-bold tabular-nums">{loan.annualInterestRatePercent}%</div>
                </div>
                <div className="min-w-[86px] flex-none text-right">
                  <div className="text-[10.5px] font-semibold text-(--fl-muted)">EMI</div>
                  <div className="text-[13.5px] font-bold tabular-nums">{formatCurrency(loan.currentEmiMinor)}</div>
                </div>
                <div className="min-w-24 flex-none text-right">
                  <div className="text-[10.5px] font-semibold text-(--fl-muted)">Paid off</div>
                  <div className="text-[13.5px] font-extrabold text-(--fl-green-dark)">
                    {closure ? formatDateOnly(closure.closureDate, "MMM yyyy") : "—"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
