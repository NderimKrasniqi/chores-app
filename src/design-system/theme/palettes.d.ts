type PaletteColors = {
  bg: string;
  surface: string;
  raised: string;
  track: string;
  dash: string;
  text: string;
  muted: string;
  primary: string;
  primaryShade: string;
  accent: string;
  accentShade: string;
  accentLight: string;
  pink: string;
  gold: string;
  goldShade: string;
  danger: string;
  pBg: string;
  pMuted: string;
  pFaint: string;
  pTrack: string;
  pStack: string;
  pPhoto: string;
};

type SemanticKey =
  | "primary"
  | "primaryShade"
  | "accent"
  | "accentShade"
  | "accentLight"
  | "pink"
  | "gold"
  | "goldShade"
  | "night"
  | "nightSurface"
  | "nightRaised"
  | "nightTrack"
  | "nightDash"
  | "star"
  | "white"
  | "canvas"
  | "surface"
  | "surfaceRaised"
  | "surfaceMuted"
  | "ink"
  | "inkMuted"
  | "inkFaint"
  | "onPrimary"
  | "onAction"
  | "action"
  | "actionPressed"
  | "actionSoft"
  | "actionSoftStrong"
  | "urgency"
  | "urgencyPressed"
  | "urgencySoft"
  | "reward"
  | "rewardSoft"
  | "info"
  | "infoSoft"
  | "infoSoftStrong"
  | "line"
  | "scrim"
  | "disabledSurface"
  | "disabledInk"
  | "glow"
  | "shadow";

declare const palettes: {
  PALETTES: Record<
    "galaxy" | "ocean" | "sunset" | "forest" | "mono",
    PaletteColors
  >;
  ACTIVE_PALETTE: "galaxy" | "ocean" | "sunset" | "forest" | "mono";
  SEMANTIC_KEYS: SemanticKey[];
  semanticTokens(
    palette: PaletteColors,
    mode: "quest" | "home",
  ): Record<SemanticKey, string>;
  cssVar(key: string): string;
  mix(hex: string, toward: string, amount: number): string;
  rgba(hex: string, alpha: number): string;
};

export = palettes;
