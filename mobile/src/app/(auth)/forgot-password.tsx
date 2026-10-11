import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Button, Card, ErrorBanner, Field, Screen, T } from "@/components/ui";
import { requestPasswordReset } from "@/lib/api";
import { useTheme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { c } = useTheme();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the reset email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title="Reset password" subtitle="We'll email you a secure link." back={() => router.back()} tabBar={false}>
      {sent ? (
        <Card style={{ alignItems: "center", gap: 12, paddingVertical: 36 }}>
          <View style={{ width: 68, height: 68, borderRadius: 24, backgroundColor: c.success + "1A", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="mail-open" size={30} color={c.success} />
          </View>
          <T size={18} weight="800">
            Check your inbox
          </T>
          <T size={14} muted style={{ textAlign: "center", lineHeight: 20 }}>
            If an account exists for {email.trim()}, a reset link is on its way. Open it to choose a new password, then
            sign in here.
          </T>
          <Button label="Back to sign in" variant="soft" onPress={() => router.back()} style={{ alignSelf: "stretch", marginTop: 12 }} />
        </Card>
      ) : (
        <>
          {error ? <ErrorBanner message={error} /> : null}
          <Field
            label="Email"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            placeholder="you@company.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <Button label="Send reset link" onPress={submit} loading={busy} />
        </>
      )}
    </Screen>
  );
}
