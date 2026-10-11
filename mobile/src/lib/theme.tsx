import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";

export interface Palette {
  dark: boolean;
  bg: string;
  card: string;
  cardAlt: string;
  text: string;
  text2: string;
  muted: string;
  faint: string;
  border: string;
  primary: string;
  primarySoft: string;
  onPrimary: string;
  success: string;
  warning: string;
  danger: string;
  chart: string[];
  gradient: [string, string, string];
  shadow: string;
}

const light: Palette = {
  dark: false,
  bg: "#F5F6FA",
  card: "#FFFFFF",
  cardAlt: "#F1F3F9",
  text: "#0B1020",
  text2: "#3B4358",
  muted: "#6B7388",
  faint: "#A4ABBD",
  border: "#E9ECF4",
  primary: "#4F46E5",
  primarySoft: "#EEF0FF",
  onPrimary: "#FFFFFF",
  success: "#12A15F",
  warning: "#E58A00",
  danger: "#E5453A",
  chart: ["#4F46E5", "#8B84F0", "#12A15F", "#F5A524", "#E5453A"],
  gradient: ["#3B35C9", "#5B3FE0", "#8A4BE0"],
  shadow: "#1B2250",
};

const dark: Palette = {
  dark: true,
  bg: "#070913",
  card: "#10131F",
  cardAlt: "#181C2C",
  text: "#F3F5FB",
  text2: "#C4CADB",
  muted: "#8F98B1",
  faint: "#566079",
  border: "#1D2236",
  primary: "#8B8CFF",
  primarySoft: "rgba(139,140,255,0.14)",
  onPrimary: "#0B0C1E",
  success: "#3DDC97",
  warning: "#FFB84D",
  danger: "#FF7A70",
  chart: ["#8B8CFF", "#5A5BD0", "#3DDC97", "#FFB84D", "#FF7A70"],
  gradient: ["#2B2796", "#4A33C4", "#6E3AC4"],
  shadow: "#000000",
};

export type ThemeMode = "system" | "light" | "dark";

interface ThemeValue {
  c: Palette;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);
const KEY = "wise.theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>("system");

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => {
        if (v === "light" || v === "dark" || v === "system") setMode(v);
      })
      .catch(() => {});
  }, []);

  const value = useMemo<ThemeValue>(() => {
    const isDark = mode === "system" ? system === "dark" : mode === "dark";
    return {
      c: isDark ? dark : light,
      mode,
      setMode: (m) => {
        setMode(m);
        void AsyncStorage.setItem(KEY, m).catch(() => {});
      },
    };
  }, [mode, system]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}

export const radius = { sm: 10, md: 14, lg: 22, xl: 30, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
