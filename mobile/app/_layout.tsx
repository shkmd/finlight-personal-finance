import "../global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "@/lib/auth-context";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function RootNavigator() {
  const { user, isRestoring } = useAuth();

  if (isRestoring) {
    return (
      <View className="flex-1 items-center justify-center bg-fl-bg">
        <ActivityIndicator color="#1a7f4b" size="large" />
      </View>
    );
  }

  // Stack.Protected actually enforces the guard against the initial/deep-
  // linked route, unlike conditionally choosing which <Stack.Screen> to
  // register — that pattern let (app)/index (which claims the root "/" as
  // a group index route) render on cold start regardless of auth state,
  // since Expo Router resolves the initial route from the file system
  // independently of which screens happen to be conditionally mounted.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootNavigator />
          <StatusBar style="dark" />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
