export interface AlertTypeDefinition {
  type: string;
  label: string;
  description: string;
  defaultThreshold?: number;
}

export const ALERT_TYPES: AlertTypeDefinition[] = [
  { type: "PLANNED_EXCEEDS_INCOME", label: "Planned expenses exceed income", description: "Your planned allocations for the month add up to more than your planned income." },
  { type: "ACTUAL_EXCEEDS_INCOME", label: "Actual expenses exceed income", description: "You've spent more this month than you've actually received." },
  { type: "UNALLOCATED_NEGATIVE", label: "Unallocated cash is negative", description: "Your budget allocations exceed your planned income for this month." },
  { type: "MONTH_END_BALANCE_LOW", label: "Month-end balance is zero or negative", description: "Your projected or actual balance at month-end is at or below zero." },
  { type: "CATEGORY_OVER_BUDGET", label: "A category exceeds its budget", description: "Actual spending in a category has passed its planned limit.", defaultThreshold: 100 },
  { type: "SPENDING_PACE_HIGH", label: "Spending pace is above plan", description: "A category is being spent faster than the proportion of the month elapsed." },
  { type: "EMI_BURDEN_HIGH", label: "EMI burden exceeds threshold", description: "Total EMIs are taking up a large share of your income.", defaultThreshold: 40 },
  { type: "CREDIT_UTILIZATION_HIGH", label: "Credit-card utilization is high", description: "A credit card balance is close to its limit.", defaultThreshold: 30 },
  { type: "BILL_DUE_SOON", label: "Bill or EMI due soon", description: "A bill, EMI, or SIP is coming up in the next few days." },
  { type: "POSSIBLE_DUPLICATE", label: "Possible duplicate transaction", description: "A transaction looks similar to one recently recorded." },
  { type: "SUBSCRIPTION_PRICE_INCREASE", label: "Recurring subscription increased", description: "A recurring transaction's amount went up compared to its usual value." },
  { type: "PAUSED_SIP_UNASSIGNED", label: "Paused SIP money unassigned", description: "Cash released from a paused SIP has not been allocated anywhere." },
  { type: "NO_EMERGENCY_CONTRIBUTION", label: "No emergency-fund contribution planned", description: "This month's budget has no allocation toward your emergency fund." },
  { type: "EMERGENCY_WITHDRAWAL", label: "Emergency savings withdrawn", description: "A withdrawal was recorded against an emergency fund." },
  { type: "INCOME_BELOW_PLAN", label: "Actual income lower than planned", description: "Received income this month is below what was planned." },
  { type: "EMI_BELOW_INTEREST", label: "EMI does not cover interest", description: "A loan's EMI is at or below its monthly interest — the balance won't reduce." },
  { type: "PREPAYMENT_CHARGE_IMPACT", label: "Prepayment charges reduce savings", description: "Prepayment or foreclosure charges materially offset the interest saved by a payoff plan." },
  { type: "INCOMPLETE_DATA", label: "Expense data looks incomplete", description: "Some transactions are missing details needed for accurate reporting." },
];

export function getAlertTypeDefinition(type: string): AlertTypeDefinition | undefined {
  return ALERT_TYPES.find((a) => a.type === type);
}
