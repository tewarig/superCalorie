"use client";

import { useState, type CSSProperties } from "react";
import { color, fontSize, radius, space } from "../tokens";
import type { ButtonProps, ButtonSize, ButtonVariant } from "./types";

const sizeStyles: Record<ButtonSize, CSSProperties> = {
  sm: { padding: `${space.sm}px ${space.lg}px`, fontSize: fontSize.sm },
  md: { padding: `${space.md}px ${space.xl}px`, fontSize: fontSize.md },
  lg: { padding: `${space.lg}px ${space.xxl}px`, fontSize: fontSize.lg },
};

function variantStyles(variant: ButtonVariant, active: boolean): CSSProperties {
  switch (variant) {
    case "primary":
      return {
        backgroundColor: active ? color.primaryPressed : color.primary,
        color: color.textOnDark,
        border: "1px solid transparent",
      };
    case "accent":
      return {
        backgroundColor: active ? color.accentPressed : color.accent,
        color: color.surface,
        border: "1px solid transparent",
      };
    case "outline":
      return {
        backgroundColor: active ? color.surfaceMuted : "transparent",
        color: color.text,
        border: `1px solid ${color.text}`,
      };
    case "ghost":
      return {
        backgroundColor: active ? color.primarySubtle : "transparent",
        color: color.primary,
        border: "1px solid transparent",
      };
  }
}

export function Button({
  children,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  fullWidth = false,
}: ButtonProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...sizeStyles[size],
        ...variantStyles(variant, hovered && !disabled),
        fontFamily: "inherit",
        fontWeight: 600,
        letterSpacing: "0.01em",
        borderRadius: radius.pill,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        width: fullWidth ? "100%" : undefined,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: space.sm,
        transition: "background-color 140ms ease, transform 140ms ease",
        transform: hovered && !disabled ? "translateY(-1px)" : "none",
      }}
    >
      {children}
    </button>
  );
}

export type { ButtonProps, ButtonSize, ButtonVariant } from "./types";
