/**
 * Quest Path colour palettes — the single source of truth for app colour.
 *
 * To try a different palette, change ACTIVE_PALETTE. Everything (Tailwind
 * classes, runtime theme tokens, SVG artwork) reads from here.
 *
 * CommonJS so tailwind.config.js can require it.
 */

/** @typedef {keyof typeof PALETTES} PaletteName */

const PALETTES = {
  galaxy: {
    bg: "#24164F",
    surface: "#34246B",
    raised: "#4A378C",
    track: "#3D2D7A",
    dash: "#7C68C8",
    text: "#FFF7E8",
    muted: "#B9ADE6",
    primary: "#C8F53B",
    primaryShade: "#93C21A",
    accent: "#FF9F43",
    accentShade: "#D9721A",
    accentLight: "#FFC37F",
    pink: "#FF8BC2",
    gold: "#FFD84D",
    goldShade: "#D6A91C",
    danger: "#E0446F",
    pBg: "#F4F0FF",
    pMuted: "#6B5FA0",
    pFaint: "#A29AC4",
    pTrack: "#E8E1FF",
    pStack: "#D9CEFF",
    pPhoto: "#2E1F63",
  },
  ocean: {
    bg: "#0B2A3F",
    surface: "#123D57",
    raised: "#1D5573",
    track: "#164863",
    dash: "#4F8FB0",
    text: "#F2FAFF",
    muted: "#9CC3D9",
    primary: "#5CF2C8",
    primaryShade: "#2DBF97",
    accent: "#FFB547",
    accentShade: "#D98A1A",
    accentLight: "#FFD58F",
    pink: "#FF8FA8",
    gold: "#FFE066",
    goldShade: "#D6B21C",
    danger: "#E24C5E",
    pBg: "#EEF6FA",
    pMuted: "#4F7388",
    pFaint: "#8FAABB",
    pTrack: "#D6E8F1",
    pStack: "#C4DDEA",
    pPhoto: "#123D57",
  },
  sunset: {
    bg: "#3A1230",
    surface: "#521A44",
    raised: "#6E2A5C",
    track: "#5E2150",
    dash: "#A45A8E",
    text: "#FFF4EC",
    muted: "#E0B3CF",
    primary: "#FFC94D",
    primaryShade: "#D69E1C",
    accent: "#FF7A59",
    accentShade: "#D4502F",
    accentLight: "#FFB29E",
    pink: "#7FE0FF",
    gold: "#FFE27A",
    goldShade: "#D6B43C",
    danger: "#E0445A",
    pBg: "#FFF3EE",
    pMuted: "#8A5474",
    pFaint: "#BF95AC",
    pTrack: "#F6DDE6",
    pStack: "#EECBD9",
    pPhoto: "#521A44",
  },
  forest: {
    bg: "#10261C",
    surface: "#1A3A2B",
    raised: "#28513D",
    track: "#1F4433",
    dash: "#5E8F74",
    text: "#F4FFF6",
    muted: "#A8CDB6",
    primary: "#D4FF5C",
    primaryShade: "#A3CC2A",
    accent: "#FF9F43",
    accentShade: "#D9721A",
    accentLight: "#FFC37F",
    pink: "#FF9EC7",
    gold: "#FFD84D",
    goldShade: "#D6A91C",
    danger: "#E0506A",
    pBg: "#F0F7F1",
    pMuted: "#4E7360",
    pFaint: "#8FAA9A",
    pTrack: "#D8EBDD",
    pStack: "#C5E0CD",
    pPhoto: "#1A3A2B",
  },
  mono: {
    bg: "#16161C",
    surface: "#23232C",
    raised: "#34343F",
    track: "#2A2A33",
    dash: "#6A6A7A",
    text: "#F5F5F7",
    muted: "#A1A1AE",
    primary: "#C8F53B",
    primaryShade: "#93C21A",
    accent: "#FF9F43",
    accentShade: "#D9721A",
    accentLight: "#FFC37F",
    pink: "#FF8BC2",
    gold: "#FFD84D",
    goldShade: "#D6A91C",
    danger: "#E0446F",
    pBg: "#F4F4F6",
    pMuted: "#5E5E6B",
    pFaint: "#9C9CA8",
    pTrack: "#E4E4EA",
    pStack: "#D6D6DE",
    pPhoto: "#23232C",
  },
};

/** Change this to switch the whole app's palette. */
const ACTIVE_PALETTE = "galaxy";

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function toHex(rgb) {
  return (
    "#" +
    rgb
      .map((v) => Math.max(0, Math.min(255, Math.round(v))))
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

/** Blend `hex` toward `toward` by `amount` (0–1). */
function mix(hex, toward, amount) {
  const a = hexToRgb(hex);
  const b = hexToRgb(toward);
  return toHex(a.map((v, i) => v + (b[i] - v) * amount));
}

function rgba(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Semantic colour roles for one surface mode.
 * - "quest": the Child app — dark night sky.
 * - "home": the Parent app and shared entry flows — light.
 * Every role exists in both modes so any screen renders in either.
 */
function semanticTokens(p, mode) {
  const shared = {
    primary: p.primary,
    primaryShade: p.primaryShade,
    accent: p.accent,
    accentShade: p.accentShade,
    accentLight: p.accentLight,
    pink: p.pink,
    gold: p.gold,
    goldShade: p.goldShade,
    night: p.bg,
    nightSurface: p.surface,
    nightRaised: p.raised,
    nightTrack: p.track,
    nightDash: p.dash,
    star: p.text,
    white: "#FFFFFF",
  };

  if (mode === "quest") {
    return {
      ...shared,
      canvas: p.bg,
      surface: p.surface,
      surfaceRaised: p.surface,
      surfaceMuted: p.track,
      ink: p.text,
      inkMuted: p.muted,
      inkFaint: mix(p.muted, p.bg, 0.35),
      onPrimary: p.bg,
      onAction: p.bg,
      action: p.primary,
      actionPressed: p.primaryShade,
      actionSoft: p.raised,
      actionSoftStrong: p.raised,
      urgency: p.pink,
      urgencyPressed: mix(p.pink, "#000000", 0.2),
      urgencySoft: mix(p.pink, p.bg, 0.72),
      reward: p.gold,
      rewardSoft: mix(p.gold, p.bg, 0.75),
      info: p.dash,
      infoSoft: p.surface,
      infoSoftStrong: p.raised,
      line: p.raised,
      scrim: "rgba(0, 0, 0, 0.6)",
      disabledSurface: p.track,
      disabledInk: mix(p.muted, p.bg, 0.4),
      glow: rgba(p.gold, 0.55),
      shadow: rgba("#000000", 0.35),
    };
  }

  return {
    ...shared,
    canvas: p.pBg,
    surface: "#FFFFFF",
    surfaceRaised: "#FFFFFF",
    surfaceMuted: p.pTrack,
    ink: p.bg,
    inkMuted: p.pMuted,
    inkFaint: p.pFaint,
    onPrimary: p.bg,
    onAction: "#FFFFFF",
    action: p.bg,
    actionPressed: mix(p.bg, "#000000", 0.25),
    actionSoft: mix(p.primary, "#FFFFFF", 0.72),
    actionSoftStrong: mix(p.primary, "#FFFFFF", 0.45),
    urgency: p.danger,
    urgencyPressed: mix(p.danger, "#000000", 0.2),
    urgencySoft: mix(p.danger, "#FFFFFF", 0.86),
    reward: p.gold,
    rewardSoft: mix(p.gold, "#FFFFFF", 0.7),
    info: p.raised,
    infoSoft: p.pTrack,
    infoSoftStrong: p.pStack,
    line: p.pTrack,
    scrim: rgba(p.bg, 0.62),
    disabledSurface: p.pTrack,
    disabledInk: p.pFaint,
    glow: rgba(p.gold, 0.55),
    shadow: rgba(p.bg, 0.14),
  };
}

const SEMANTIC_KEYS = Object.keys(semanticTokens(PALETTES.galaxy, "home"));

function cssVar(key) {
  return `--c-${key}`;
}

module.exports = {
  PALETTES,
  ACTIVE_PALETTE,
  SEMANTIC_KEYS,
  semanticTokens,
  cssVar,
  mix,
  rgba,
};
