import { Pressable, Text, type PressableProps } from "react-native";
import { labelClasses, sizeClasses, toneClasses, type ButtonSize, type ButtonTone } from "./types";

export type AppButtonProps = Omit<PressableProps, "children"> & {
  children: string;
  tone?: ButtonTone;
  size?: ButtonSize;
  fullWidth?: boolean;
};

export function AppButton({
  children,
  tone = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  className,
  ...props
}: AppButtonProps) {
  const isDisabled = Boolean(disabled);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      className={`items-center justify-center rounded-full ${toneClasses[tone]} ${sizeClasses[size]} ${fullWidth ? "self-stretch" : "self-start"} ${isDisabled ? "opacity-40" : ""} ${className ?? ""}`}
      disabled={isDisabled}
      {...props}
    >
      <Text className={`font-bold text-sm ${labelClasses[tone]}`}>{children}</Text>
    </Pressable>
  );
}
