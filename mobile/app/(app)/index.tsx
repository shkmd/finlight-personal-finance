import { useQuery } from "@tanstack/react-query";
import { View, Text, ScrollView, ActivityIndicator, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatCurrency, formatPercent } from "@finlight/core/money";
import { apiRequest } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

interface DashboardSummary {
  monthLabel: string;
  totalIncomeReceivedMinor: number;
  totalExpensesThisMonthMinor: number;
  netThisMonthMinor: number;
  savingsRatePercent: number;
  currentAvailableCashMinor: number;
  liquidAccountsCount: number;
  totalOutstandingDebtMinor: number;
  totalMonthlyEmiMinor: number;
  emiToIncomeRatio: number;
  activeSipMonthlyMinor: number;
  activeInvestmentsCount: number;
  emergencyFundBalanceMinor: number;
  emergencyFundProgressPercent: number;
  activity: Array<{ id: string; description: string; meta: string; amountMinor: number; isIncome: boolean }>;
}

function Tile({
  label,
  value,
  pill,
  sub,
  valueColor,
  filled,
}: {
  label: string;
  value: string;
  pill: string;
  sub: string;
  valueColor?: string;
  filled?: boolean;
}) {
  return (
    <View
      className="min-w-[47%] flex-1 gap-2 rounded-2xl p-4"
      style={{ backgroundColor: filled ? "#0c4429" : "#ffffff" }}
    >
      <Text className="text-xs font-semibold" style={{ color: filled ? "#bfe4cf" : "#6c7873" }}>
        {label}
      </Text>
      <Text className="text-xl font-extrabold" style={{ color: valueColor ?? (filled ? "#ffffff" : "#0f1512") }}>
        {value}
      </Text>
      <View className="flex-row items-center gap-1.5">
        <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: filled ? "rgba(255,255,255,0.14)" : "#eaf5ee" }}>
          <Text className="text-[10px] font-bold" style={{ color: filled ? "#bfe4cf" : "#0c4429" }}>
            {pill}
          </Text>
        </View>
        <Text className="text-[11px]" style={{ color: filled ? "rgba(255,255,255,0.72)" : "#6c7873" }}>
          {sub}
        </Text>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const { data, isLoading, isRefetching, refetch, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiRequest<DashboardSummary>("/api/mobile/v1/dashboard"),
  });

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-fl-bg">
        <ActivityIndicator color="#1a7f4b" size="large" />
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView className="flex-1 bg-fl-bg px-5 pt-4">
        <Text className="text-fl-red">{(error as Error)?.message ?? "Something went wrong."}</Text>
      </SafeAreaView>
    );
  }

  const isEmpty = data.totalIncomeReceivedMinor === 0 && data.totalExpensesThisMonthMinor === 0 && data.totalOutstandingDebtMinor === 0;

  return (
    <SafeAreaView className="flex-1 bg-fl-bg">
      <ScrollView
        contentContainerClassName="gap-4 px-5 pt-2 pb-8"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#1a7f4b" />}
      >
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-extrabold text-fl-ink">Hi, {user?.name?.split(" ")[0]}</Text>
            <Text className="text-sm text-fl-muted">{data.monthLabel}</Text>
          </View>
          <Pressable onPress={logout} className="rounded-full bg-fl-card px-4 py-2">
            <Text className="text-sm font-semibold text-fl-red">Sign out</Text>
          </Pressable>
        </View>

        <View className="flex-row flex-wrap gap-3">
          <Tile
            filled
            label="Net this month"
            value={isEmpty ? "—" : formatCurrency(data.netThisMonthMinor)}
            pill={isEmpty ? "No data" : `${formatPercent(data.savingsRatePercent, 0)} saved`}
            sub="Income minus expenses & investments"
          />
          <Tile
            label="Available cash"
            value={formatCurrency(data.currentAvailableCashMinor)}
            pill={data.liquidAccountsCount ? `${data.liquidAccountsCount} accounts` : "No accounts"}
            sub="Across liquid accounts"
          />
          <Tile
            label="Outstanding debt"
            value={formatCurrency(data.totalOutstandingDebtMinor)}
            valueColor="#c0392b"
            pill={data.totalMonthlyEmiMinor ? `${formatCurrency(data.totalMonthlyEmiMinor)} EMI` : "No loans"}
            sub={data.totalMonthlyEmiMinor ? `${formatPercent(data.emiToIncomeRatio, 0)} of income` : "Add a loan"}
          />
          <Tile
            label="Investments"
            value={formatCurrency(data.activeSipMonthlyMinor)}
            pill={data.activeInvestmentsCount ? `${data.activeInvestmentsCount} active` : "No SIPs"}
            sub="Monthly SIP commitment"
          />
          <Tile
            label="Emergency fund"
            value={formatCurrency(data.emergencyFundBalanceMinor)}
            pill={`${formatPercent(data.emergencyFundProgressPercent, 0)} funded`}
            sub="Of your target"
          />
        </View>

        <View className="gap-2.5 rounded-2xl bg-fl-card p-4">
          <Text className="text-base font-extrabold text-fl-ink">Latest activity</Text>
          {data.activity.length === 0 ? (
            <Text className="text-sm text-fl-muted">No transactions recorded yet.</Text>
          ) : (
            data.activity.map((item) => (
              <View key={item.id} className="flex-row items-center justify-between border-t border-fl-line pt-2.5">
                <View className="flex-1 pr-3">
                  <Text className="font-semibold text-fl-ink" numberOfLines={1}>
                    {item.description}
                  </Text>
                  <Text className="text-xs text-fl-muted">{item.meta}</Text>
                </View>
                <Text className="font-bold" style={{ color: item.isIncome ? "#1a7f4b" : "#0f1512" }}>
                  {item.isIncome ? "+" : "-"}
                  {formatCurrency(item.amountMinor)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
