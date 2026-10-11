import { useRouter } from "expo-router";
import { useState } from "react";
import { Button, Card, ErrorBanner, Field, Screen, Segmented, T } from "@/components/ui";
import { updatePassword } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTheme, type ThemeMode } from "@/lib/theme";

export default function SettingsScreen() {
  const router = useRouter();
  const { c, mode, setMode } = useTheme();
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    if (password !== confirm) {
      setMessage({ ok: false, text: "Passwords don't match." });
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      setPassword("");
      setConfirm("");
      setMessage({ ok: true, text: "Password updated." });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Could not update your password." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title="Settings" subtitle={user?.email} back={() => router.back()} tabBar={false}>
      <Card style={{ gap: 14 }}>
        <T size={16} weight="700">
          Appearance
        </T>
        <Segmented
          value={mode}
          onChange={(m: ThemeMode) => setMode(m)}
          options={[
            { key: "system", label: "System" },
            { key: "light", label: "Light" },
            { key: "dark", label: "Dark" },
          ]}
        />
      </Card>

      <Card style={{ gap: 16 }}>
        <T size={16} weight="700">
          Change password
        </T>
        {message ? message.ok ? <T size={13} weight="600" color={c.success}>{message.text}</T> : <ErrorBanner message={message.text} /> : null}
        <Field label="New password" icon="lock-closed-outline" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" placeholder="At least 8 characters" />
        <Field label="Confirm password" icon="lock-closed-outline" value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" placeholder="Repeat the password" />
        <Button label="Update password" onPress={save} loading={busy} disabled={!password} />
      </Card>
    </Screen>
  );
}
