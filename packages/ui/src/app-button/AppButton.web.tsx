import type { ButtonHTMLAttributes } from "react";
import { labelClasses, sizeClasses, toneClasses, type ButtonSize, type ButtonTone } from "./types";

export type AppButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
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
  return (
    <button
      className={`inline-flex items-center justify-center rounded-full font-bold text-sm transition-opacity ${toneClasses[tone]} ${labelClasses[tone]} ${sizeClasses[size]} ${fullWidth ? "w-full" : "self-start"} ${disabled ? "opacity-40" : "hover:opacity-90"} ${className ?? ""}`}
      disabled={disabled}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
