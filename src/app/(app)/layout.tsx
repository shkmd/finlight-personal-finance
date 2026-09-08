import { requireUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Topbar } from "@/components/layout/topbar";
import { listLoans } from "@/lib/actions/loans";
import { hasSampleData } from "@/lib/actions/sampleData";
import { simulateMinimumPaymentsBaseline, type PayoffLoanInput } from "@/lib/finance/payoff";
import { formatDateOnly } from "@/lib/dates";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const userId = await requireUserId();
  const [user, preference, loans, sampleDataExists] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true } }),
    prisma.userFinancialPreference.upsert({ where: { userId }, update: {}, create: { userId } }),
    listLoans(),
    hasSampleData(),
  ]);

  const activeLoans = loans.filter((l) => l.status === "ACTIVE");
  let debtFreeLabel = "Add a loan";
  let debtFreeSub = "No debt tracked yet";
  if (activeLoans.length > 0) {
    const loanInputs: PayoffLoanInput[] = activeLoans.map((l) => ({
      loanId: l.id,
      name: l.name,
      balanceMinor: l.currentOutstandingPrincipalMinor,
      annualRatePercent: l.annualInterestRatePercent,
      emiMinor: l.currentEmiMinor,
    }));
    const baseline = simulateMinimumPaymentsBaseline(loanInputs, new Date());
    if (baseline.debtFreeDate) {
      debtFreeLabel = formatDateOnly(baseline.debtFreeDate, "MMM yyyy");
      debtFreeSub = "At minimum EMIs — run a scenario to go faster";
    } else {
      debtFreeLabel = "Needs attention";
      debtFreeSub = "Minimum EMIs won't clear this debt";
    }
  }

  return (
    <div className="flex h-screen justify-center bg-background p-5">
      <div className="flex w-full max-w-[1400px] items-stretch overflow-hidden rounded-[26px] bg-(--fl-card) shadow-[0_18px_50px_rgba(15,21,18,0.10)]">
        <SidebarNav debtFreeLabel={debtFreeLabel} debtFreeSub={debtFreeSub} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            userName={user.name}
            userEmail={user.email}
            currency={preference.currency}
            locale={preference.locale}
            hasSampleData={sampleDataExists}
          />
          <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-(--fl-content-bg) pb-24 md:pb-0">
            <div className="flex flex-col gap-4 p-[22px_18px_28px] md:p-[22px_24px_28px]">{children}</div>
          </main>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
