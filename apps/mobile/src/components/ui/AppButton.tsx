import { Pressable, Text, type PressableProps } from "react-native";

type ButtonTone = "primary" | "secondary" | "quiet" | "danger";
type ButtonSize = "sm" | "md";

export type AppButtonProps = Omit<PressableProps, "children"> & {
  children: string;
  tone?: ButtonTone;
  size?: ButtonSize;
  fullWidth?: boolean;
};

const toneClasses: Record<ButtonTone, string> = {
  primary: "bg-moss",
  secondary: "border border-moss bg-paper",
  quiet: "bg-moss-pale",
  danger: "bg-berry",
};

const labelClasses: Record<ButtonTone, string> = {
  primary: "text-paper",
  secondary: "text-moss",
  quiet: "text-moss",
  danger: "text-paper",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-10 px-4",
  md: "min-h-13 px-5",
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
