import { listPayoffScenarios } from "@/lib/actions/payoffScenarios";
import {
  exportExpensesCsv,
  exportIncomeCsv,
  exportLoanSummaryCsv,
  exportLoanPaymentsCsv,
  exportSipContributionsCsv,
  exportEmergencyFundTransactionsCsv,
} from "@/lib/actions/exports";
import { PageHeader } from "@/components/finance/page-header";
import { ExportButton } from "@/components/finance/reports/export-button";
import { BudgetExportControl, ScenarioExportControl } from "@/components/finance/reports/parameterized-exports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ReportsPage() {
  const scenarios = await listPayoffScenarios();

  return (
    <div>
      <PageHeader title="Reports" description="Export your financial data as CSV for records or further analysis." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transactions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <ExportButton label="Expenses" filename="expenses.csv" action={exportExpensesCsv} />
            <ExportButton label="Income" filename="income.csv" action={exportIncomeCsv} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Loans</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <ExportButton label="Loan summary" filename="loan-summary.csv" action={exportLoanSummaryCsv} />
            <ExportButton label="Loan payments" filename="loan-payments.csv" action={exportLoanPaymentsCsv} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Investments & Emergency Fund</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <ExportButton label="SIP contributions" filename="sip-contributions.csv" action={exportSipContributionsCsv} />
            <ExportButton label="Emergency fund transactions" filename="emergency-fund-transactions.csv" action={exportEmergencyFundTransactionsCsv} />
          </CardContent>
        </Card>

        <BudgetExportControl />
        <ScenarioExportControl scenarios={scenarios} />
      </div>
    </div>
  );
}
