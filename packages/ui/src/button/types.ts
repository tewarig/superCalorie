import type { ReactNode } from "react";

export type ButtonVariant = "primary" | "accent" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

/**
 * Shared contract for Button across platforms. Each platform file
 * (Button.web.tsx / Button.native.tsx) implements this same API, so
 * call sites look identical in Next.js and Expo.
 */
export interface ButtonProps {
  children: ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  /** Stretch to fill the parent's width. */
  fullWidth?: boolean;
}
