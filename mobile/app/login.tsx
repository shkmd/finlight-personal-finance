import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { loginSchema, registerSchema } from "@finlight/core/validations/auth";
import { useAuth, ApiError } from "@/lib/auth-context";

/**
 * Deliberately plain useState rather than react-hook-form here: RHF earns
 * its keep on the app's larger, many-field forms (see the phased plan —
 * transactions, loans, etc.), but binding two structurally-different
 * schemas (login vs. register) to one shared form instance fights
 * TypeScript for no real benefit on a 3-field form. Validation still goes
 * through the same Zod schemas the web app and API share.
 */
export default function LoginScreen() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { login, register: registerUser } = useAuth();

  async function onSubmit() {
    setErrorMessage(null);
    const schema = mode === "login" ? loginSchema : registerSchema;
    const parsed = schema.safeParse({ name, email, password });
    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "Check the fields above.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "login") {
        await login(parsed.data.email, parsed.data.password);
      } else {
        const r = parsed.data as { name: string; email: string; password: string };
        await registerUser(r.name, r.email, r.password);
      }
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-fl-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-center px-6"
      >
        <Text className="mb-1 text-3xl font-extrabold text-fl-ink">Finlight</Text>
        <Text className="mb-8 text-fl-muted">{mode === "login" ? "Sign in to your account" : "Create your account"}</Text>

        <View className="gap-3 rounded-2xl bg-fl-card p-5" style={{ shadowOpacity: 0.06, shadowRadius: 12 }}>
          {mode === "register" ? (
            <View>
              <Text className="mb-1 text-xs font-semibold text-fl-muted">Name</Text>
              <TextInput
                autoCapitalize="words"
                value={name}
                onChangeText={setName}
                className="rounded-xl border border-fl-line px-3.5 py-3 text-fl-ink"
                placeholder="Your name"
              />
            </View>
          ) : null}

          <View>
            <Text className="mb-1 text-xs font-semibold text-fl-muted">Email</Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              className="rounded-xl border border-fl-line px-3.5 py-3 text-fl-ink"
              placeholder="you@example.com"
            />
          </View>

          <View>
            <Text className="mb-1 text-xs font-semibold text-fl-muted">Password</Text>
            <TextInput
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              className="rounded-xl border border-fl-line px-3.5 py-3 text-fl-ink"
              placeholder="••••••••"
            />
          </View>

          {errorMessage ? <Text className="text-sm font-medium text-fl-red">{errorMessage}</Text> : null}

          <Pressable
            disabled={isSubmitting}
            onPress={onSubmit}
            className="mt-1 items-center rounded-full bg-fl-green py-3.5 active:bg-fl-green-dark"
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="font-bold text-white">{mode === "login" ? "Sign in" : "Create account"}</Text>
            )}
          </Pressable>
        </View>

        <Pressable
          onPress={() => {
            setErrorMessage(null);
            setMode(mode === "login" ? "register" : "login");
          }}
          className="mt-5 items-center"
        >
          <Text className="text-sm font-semibold text-fl-green-dark">
            {mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
