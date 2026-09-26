import { createContext, useContext, useMemo, type ReactNode } from "react";
import { View, type ViewProps } from "react-native";
import { vars } from "nativewind";

import palettes from "./palettes";

export type ThemeMode = "quest" | "home";
export type PaletteName = keyof typeof palettes.PALETTES;
export type ThemeTokens = ReturnType<typeof buildTokens>;

function buildTokens(name: PaletteName, mode: ThemeMode) {
  return palettes.semanticTokens(palettes.PALETTES[name], mode);
}

export const activePaletteName = palettes.ACTIVE_PALETTE as PaletteName;

export const questTokens = buildTokens(activePaletteName, "quest");
export const homeTokens = buildTokens(activePaletteName, "home");

function toVars(tokens: Record<string, string>) {
  return vars(
    Object.fromEntries(
      Object.entries(tokens).map(([key, value]) => [
        palettes.cssVar(key),
        value,
      ]),
    ),
  );
}

const questVars = toVars(questTokens);
const homeVars = toVars(homeTokens);

type ThemeContextValue = { mode: ThemeMode; tokens: ThemeTokens };

const ThemeContext = createContext<ThemeContextValue>({
  mode: "home",
  tokens: homeTokens,
});

/**
 * Sets the colour mode for everything inside it. Class names such as
 * `bg-canvas` and components using `useTheme()` both follow the scope.
 */
export function ThemeScope({
  mode,
  children,
  style,
  ...props
}: ViewProps & { mode: ThemeMode; children: ReactNode }) {
  const value = useMemo(
    () => ({ mode, tokens: mode === "quest" ? questTokens : homeTokens }),
    [mode],
  );
  return (
    <ThemeContext.Provider value={value}>
      <View
        {...props}
        style={[{ flex: 1 }, mode === "quest" ? questVars : homeVars, style]}
      >
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export const fontFamily = {
  display: "Fredoka_700Bold",
  displayMedium: "Fredoka_600SemiBold",
  body: "Nunito_600SemiBold",
  bodyBold: "Nunito_700Bold",
  bodyHeavy: "Nunito_800ExtraBold",
} as const;
