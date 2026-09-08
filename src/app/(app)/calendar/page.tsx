import { getCashFlowForecast } from "@/lib/actions/cashflow";
import { PageHeader } from "@/components/finance/page-header";
import { CashflowView } from "@/components/finance/calendar/cashflow-view";

export default async function CalendarPage() {
  const forecast = await getCashFlowForecast(60);

  return (
    <div>
      <PageHeader title="Cash-Flow Calendar" description="A 60-day look-ahead of income, EMIs, SIPs and bills. Figures are estimates." />
      <CashflowView forecast={forecast} />
    </div>
  );
}
