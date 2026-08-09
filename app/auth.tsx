import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { LogIn, UserPlus } from "lucide-react-native";

import { useAuth } from "../src/auth/AuthProvider";
import { useTheme } from "../src/theme/ThemeContext";
import { AppText as Text } from "../src/ui/AppText";
import { AppButton, AppTextInput, Card, MutedLabel, SegmentedControl, Subtitle, Title } from "../src/ui/primitives";

type AuthMode = "sign-in" | "sign-up";

export default function AuthScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const { isConfigured, signInWithPassword, signUpWithPassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || password.length < 6) {
      setError("Enter an email and a password with at least 6 characters.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "sign-in") {
        await signInWithPassword(trimmedEmail, password);
        router.replace("/settings" as Href);
      } else {
        const result = await signUpWithPassword(trimmedEmail, password);
        setMessage(result.needsEmailConfirmation ? "Check your email to confirm your account." : "Account created.");
        if (!result.needsEmailConfirmation) {
          router.replace("/settings" as Href);
        }
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: tokens.bg }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 22, gap: 18 }}
      >
        <View style={{ gap: 8 }}>
          <MutedLabel>REGIMEN account</MutedLabel>
          <Title>Sync your system</Title>
          <Subtitle>Sign in to connect this device to the same Supabase data used by the web app.</Subtitle>
        </View>

        <Card style={{ gap: 14 }}>
          <SegmentedControl<AuthMode>
            value={mode}
            onChange={(value) => {
              setMode(value);
              setError(null);
              setMessage(null);
            }}
            options={[
              { value: "sign-in", label: "Sign in" },
              { value: "sign-up", label: "Create" },
            ]}
          />

          {!isConfigured ? (
            <View style={{ gap: 8 }}>
              <Text style={{ color: tokens.text, fontSize: 15, fontWeight: "700" }}>Supabase is not configured yet.</Text>
              <Text style={{ color: tokens.textSecondary, fontSize: 13, lineHeight: 19 }}>
                Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local, then restart Expo.
              </Text>
            </View>
          ) : (
            <>
              <AppTextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
              />
              <AppTextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                secureTextEntry
                textContentType={mode === "sign-in" ? "password" : "newPassword"}
              />
              {error ? <Text style={{ color: tokens.danger, fontSize: 13 }}>{error}</Text> : null}
              {message ? <Text style={{ color: tokens.textSecondary, fontSize: 13 }}>{message}</Text> : null}
              <AppButton
                label={mode === "sign-in" ? "Sign in" : "Create account"}
                onPress={submit}
                disabled={busy}
                icon={mode === "sign-in" ? <LogIn size={16} color={tokens.onAccent} /> : <UserPlus size={16} color={tokens.onAccent} />}
              />
            </>
          )}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
