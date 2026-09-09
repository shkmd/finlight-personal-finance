export function creditUtilizationPercent(currentBalanceMinor: number, creditLimitMinor: number): number {
  if (creditLimitMinor <= 0) return 0;
  return Math.max(0, (currentBalanceMinor / creditLimitMinor) * 100);
}

export function availableCreditMinor(creditLimitMinor: number, currentBalanceMinor: number): number {
  return Math.max(0, creditLimitMinor - currentBalanceMinor);
}

export function isPastDue(dueDate: Date, asOf: Date = new Date()): boolean {
  return asOf.getTime() > dueDate.getTime();
}
