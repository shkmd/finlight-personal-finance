import { listLoans } from "@/lib/actions/loans";
import { getReleasedSipForDebtMinor } from "@/lib/actions/investments";
import { listPayoffScenarios } from "@/lib/actions/payoffScenarios";
import { PageHeader } from "@/components/finance/page-header";
import { ScenarioBuilder } from "@/components/finance/debt-planner/scenario-builder";
import { SavedScenariosList } from "@/components/finance/debt-planner/saved-scenarios-list";
import { EmptyState } from "@/components/finance/empty-state";
import { Target } from "lucide-react";

export default async function DebtPlannerPage() {
  const [loans, releasedSipMinor, scenarios] = await Promise.all([
    listLoans(),
    getReleasedSipForDebtMinor(),
    listPayoffScenarios(),
  ]);

  const activeLoans = loans.filter((l) => l.status === "ACTIVE");

  return (
    <div>
      <PageHeader title="Debt Planner" description="Compare avalanche, snowball, and custom payoff strategies." />
      {activeLoans.length === 0 ? (
        <EmptyState icon={Target} title="Add a loan first" description="You need at least one active loan to build a payoff scenario." />
      ) : (
        <ScenarioBuilder loans={activeLoans} releasedSipMinor={releasedSipMinor} />
      )}

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Saved scenarios</h2>
        <SavedScenariosList scenarios={scenarios} />
      </div>
    </div>
  );
}
