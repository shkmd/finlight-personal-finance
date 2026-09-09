import { useQuery } from "@tanstack/react-query";
import { View, Text, FlatList, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatCurrency } from "@finlight/core/money";
import { apiRequest } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

interface Account {
  id: string;
  name: string;
  type: string;
  institution: string | null;
  currentBalanceMinor: number;
}

export default function AccountsScreen() {
  const { user, logout } = useAuth();
  const { data, isLoading, isRefetching, refetch, error } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => apiRequest<Account[]>("/api/mobile/v1/accounts"),
  });

  return (
    <SafeAreaView className="flex-1 bg-fl-bg">
      <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
        <View>
          <Text className="text-2xl font-extrabold text-fl-ink">Accounts</Text>
          <Text className="text-sm text-fl-muted">Signed in as {user?.name}</Text>
        </View>
        <Pressable onPress={logout} className="rounded-full bg-fl-card px-4 py-2">
          <Text className="text-sm font-semibold text-fl-red">Sign out</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator className="mt-10" color="#1a7f4b" />
      ) : error ? (
        <Text className="px-5 text-fl-red">{(error as Error).message}</Text>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerClassName="gap-2.5 px-5 pb-8"
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#1a7f4b" />}
          ListEmptyComponent={
            <View className="items-center rounded-2xl bg-fl-card p-8">
              <Text className="font-semibold text-fl-ink">No accounts yet</Text>
              <Text className="mt-1 text-center text-sm text-fl-muted">
                Add one from the web app and it will show up here — this screen proves the mobile app is reading
                live data from the same backend.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View className="flex-row items-center justify-between rounded-2xl bg-fl-card p-4">
              <View>
                <Text className="font-semibold text-fl-ink">{item.name}</Text>
                <Text className="text-xs text-fl-muted">{item.institution ?? item.type}</Text>
              </View>
              <Text className="font-bold text-fl-ink">{formatCurrency(item.currentBalanceMinor)}</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
