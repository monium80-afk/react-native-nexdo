/**
 * Nexdo — Design System ("Warm Signal") color tokens.
 * Mirrors the `@theme` block in global.css. Use these only where a
 * component can't take a `className` (SafeAreaView, Modal, Animated.View,
 * StyleSheet-driven shadows) — everywhere else, use the NativeWind
 * utilities (e.g. `bg-cream-50`, `text-ink-charcoal`) instead.
 *
 * Keep this file's values in sync with global.css if the design system
 * changes — it is not generated from the CSS.
 */

export const colors = {
  cream: {
    50: "#F7F4E8",
    100: "#EFEBDA",
    200: "#E2DDC6",
    300: "#CFC9AC",
  },
  charcoal: {
    900: "#1E1C19",
    800: "#28251F",
    600: "#4A453B",
    400: "#8B8574",
  },
  orange: {
    500: "#E2622E",
    600: "#C74F20",
    100: "#F7E1D2",
  },
  amber: {
    500: "#C8912C",
    100: "#F3E7CC",
  },
  olive: {
    500: "#71824A",
    100: "#E4E8D3",
  },
  overdue: {
    500: "#B5432F",
    100: "#F2DCD5",
  },
  category: {
    work: { 500: "#5F7A93", 100: "#DDE6EC" },
    school: { 500: "#A85C3F", 100: "#F0DCD1" },
    personal: { 500: "#6E8A6C", 100: "#E2E9DD" },
    other: { 500: "#7A7566", 100: "#E9E6DA" },
  },
  ink: {
    cream: "#211E19",
    creamMuted: "#6B6656",
    charcoal: "#F5F1E6",
    charcoalMuted: "#A39D8A",
  },
  scrim: "rgba(30, 28, 25, 0.5)",
  hairlineCharcoal: "rgba(255, 255, 255, 0.08)",
} as const;
