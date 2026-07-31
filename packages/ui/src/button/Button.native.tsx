import { Pressable, Text, type TextStyle, type ViewStyle } from "react-native";
import { color, fontSize, radius, space } from "../tokens";
import type { ButtonProps, ButtonSize, ButtonVariant } from "./types";

const sizeStyles: Record<ButtonSize, { container: ViewStyle; label: TextStyle }> = {
  sm: {
    container: { paddingVertical: space.sm, paddingHorizontal: space.lg },
    label: { fontSize: fontSize.sm },
  },
  md: {
    container: { paddingVertical: space.md, paddingHorizontal: space.xl },
    label: { fontSize: fontSize.base },
  },
  lg: {
    container: { paddingVertical: space.lg, paddingHorizontal: space.xxl },
    label: { fontSize: fontSize.lg },
  },
};

function variantStyles(
  variant: ButtonVariant,
  pressed: boolean,
): { container: ViewStyle; label: TextStyle } {
  switch (variant) {
    case "primary":
      return {
        container: {
          backgroundColor: pressed ? color.primaryPressed : color.primary,
        },
        label: { color: color.textOnDark },
      };
    case "accent":
      return {
        container: {
          backgroundColor: pressed ? color.secondaryPressed : color.secondary,
        },
        label: { color: color.surface },
      };
    case "outline":
      return {
        container: {
          backgroundColor: pressed ? color.surfaceMuted : "transparent",
          borderWidth: 1,
          borderColor: color.text,
        },
        label: { color: color.text },
      };
    case "ghost":
      return {
        container: {
          backgroundColor: pressed ? color.primarySubtle : "transparent",
        },
        label: { color: color.primary },
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          borderRadius: radius.pill,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: space.sm,
          opacity: disabled ? 0.45 : 1,
          alignSelf: fullWidth ? "stretch" : "flex-start",
        },
        sizeStyles[size].container,
        variantStyles(variant, pressed && !disabled).container,
      ]}
    >
      {({ pressed }) => (
        <Text
          style={[
            { fontWeight: "600", letterSpacing: 0.2 },
            sizeStyles[size].label,
            variantStyles(variant, pressed && !disabled).label,
          ]}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
}

export type { ButtonProps, ButtonSize, ButtonVariant } from "./types";
