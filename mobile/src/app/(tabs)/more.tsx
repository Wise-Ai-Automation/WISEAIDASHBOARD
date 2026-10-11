import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { Alert, Platform, Pressable, View } from "react-native";
import { Avatar, Badge, Group, Overline, Reveal, Screen, Segmented, T, tap, type IconName } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useTheme, type ThemeMode } from "@/lib/theme";

function Row({ icon, label, hint, href, onPress, tint }: { icon: IconName; label: string; hint?: string; href?: Href; onPress?: () => void; tint?: string }) {
  const router = useRouter();
  const { c } = useTheme();
  const color = tint ?? c.primary;
  return (
    <Pressable
      onPress={() => {
        tap();
        if (href) router.push(href);
        else onPress?.();
      }}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, backgroundColor: pressed ? c.cardAlt : "transparent" })}
    >
      <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: color + "1A", alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <T size={15} weight="600" color={tint}>
          {label}
        </T>
        {hint ? (
          <T size={12} muted>
            {hint}
          </T>
        ) : null}
      </View>
      {href ? <Ionicons name="chevron-forward" size={18} color={c.faint} /> : null}
    </Pressable>
  );
}

export default function MoreScreen() {
  const { c, mode, setMode } = useTheme();
  const { user, isAdmin, viewingAs, setViewingAs, signOut } = useAuth();
  if (!user) return null;

  const confirmSignOut = () => {
    if (Platform.OS === "web") {
      void signOut();
      return;
    }
    Alert.alert("Sign out?", "You'll need to sign in again to see your analytics.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void signOut() },
    ]);
  };

  return (
    <Screen title="Account">
      <Reveal index={0}>
        <View style={{ alignItems: "center", gap: 12, paddingVertical: 8 }}>
          <Avatar name={user.full_name} size={84} />
          <View style={{ alignItems: "center", gap: 4 }}>
            <T size={22} weight="800">
              {user.full_name}
            </T>
            <T size={14} muted>
              {user.email}
            </T>
          </View>
          <View style={{ alignItems: "center" }}>
            <Badge dot label={user.role === "admin" ? "Administrator" : "Client account"} color={c.primary} />
          </View>
        </View>
      </Reveal>

      {viewingAs ? (
        <Pressable
          onPress={() => setViewingAs(null)}
          style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 16, backgroundColor: c.warning + "1A", borderWidth: 1, borderColor: c.warning + "44" }}
        >
          <Ionicons name="eye" size={17} color={c.warning} />
          <T size={13} weight="600" style={{ flex: 1 }}>
            Viewing as {viewingAs.full_name}
          </T>
          <T size={13} weight="700" color={c.primary}>
            Exit
          </T>
        </Pressable>
      ) : null}

      <Reveal index={1} style={{ gap: 10 }}>
        <Overline>Workspace</Overline>
        <Group>
          <Row icon="megaphone" label="Campaigns" hint="Launch bulk call campaigns" href="/campaigns" />
          {isAdmin ? <Row icon="people" label="Subaccounts" hint="Client access and status" href="/admin/subaccounts" /> : null}
          {isAdmin ? <Row icon="wallet" label="Billing" hint="Rates and daily spend limit" href="/admin/billing" /> : null}
        </Group>
      </Reveal>

      <Reveal index={2} style={{ gap: 10 }}>
        <Overline>Appearance</Overline>
        <Segmented
          value={mode}
          onChange={(m: ThemeMode) => setMode(m)}
          options={[
            { key: "system", label: "System" },
            { key: "light", label: "Light" },
            { key: "dark", label: "Dark" },
          ]}
        />
      </Reveal>

      <Reveal index={3} style={{ gap: 10 }}>
        <Overline>Account</Overline>
        <Group>
          <Row icon="settings" label="Settings" hint="Password and security" href="/settings" />
          <Row icon="log-out" label="Sign out" onPress={confirmSignOut} tint={c.danger} />
        </Group>
      </Reveal>
    </Screen>
  );
}
