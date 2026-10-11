import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WiseLogo } from "@/components/logo";
import { Button, ErrorBanner, Field, T } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { radius, space, useTheme } from "@/lib/theme";

const BARS = [22, 38, 30, 54, 42, 66, 48, 76, 58, 84, 64, 50, 70, 44];

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (busy) return;
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (e) {
      const detail = (e as { detail?: string }).detail;
      const base = e instanceof Error ? e.message : "Could not sign you in.";
      setError(detail ? `${base} (${detail})` : base);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        <LinearGradient
          colors={c.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: insets.top + space.xl, paddingHorizontal: space.xl + 4, paddingBottom: 64, gap: 28, overflow: "hidden" }}
        >
          <View style={{ position: "absolute", right: -70, top: -60, width: 240, height: 240, borderRadius: 120, backgroundColor: "rgba(255,255,255,0.08)" }} />
          <View style={{ position: "absolute", left: -60, bottom: -90, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(255,255,255,0.06)" }} />
          <WiseLogo light subtitle="Voice analytics" />
          <View style={{ gap: 12 }}>
            <T size={32} weight="800" color="#fff" style={{ lineHeight: 38 }}>
              Every call, understood.
            </T>
            <T size={15} color="rgba(255,255,255,0.78)" style={{ lineHeight: 22 }}>
              Live analytics, transcripts and recordings from your voice agents.
            </T>
          </View>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, height: 72 }}>
            {BARS.map((h, i) => (
              <View key={i} style={{ flex: 1, height: h * 0.85, borderRadius: 6, backgroundColor: "#fff", opacity: 0.18 + i * 0.045 }} />
            ))}
          </View>
        </LinearGradient>

        <View
          style={{
            flex: 1,
            marginTop: -32,
            backgroundColor: c.bg,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            padding: space.xl + 4,
            paddingBottom: insets.bottom + space.xl,
            gap: space.xl,
          }}
        >
          <View style={{ gap: 6 }}>
            <T size={26} weight="800">
              Welcome back
            </T>
            <T size={15} muted>
              Sign in to your workspace.
            </T>
          </View>

          {error ? <ErrorBanner message={error} /> : null}

          <View style={{ gap: space.lg }}>
            <Field
              label="Email"
              icon="mail-outline"
              value={email}
              onChangeText={setEmail}
              placeholder="you@company.com"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              textContentType="username"
            />
            <Field
              label="Password"
              icon="lock-closed-outline"
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              secureTextEntry={!show}
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
              onSubmitEditing={submit}
              returnKeyType="go"
              right={
                <Pressable onPress={() => setShow((s) => !s)} hitSlop={10}>
                  <Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={20} color={c.muted} />
                </Pressable>
              }
            />
          </View>

          <Link href="/forgot-password" asChild>
            <Pressable style={{ alignSelf: "flex-end", marginTop: -8 }} hitSlop={8}>
              <T size={13} weight="700" color={c.primary}>
                Forgot password?
              </T>
            </Pressable>
          </Link>

          <Button label="Sign in" onPress={submit} loading={busy} />
          <T size={12} muted style={{ textAlign: "center" }}>
            Accounts are created by your administrator.
          </T>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
