export type ButtonTone = "primary" | "secondary" | "quiet" | "danger";
export type ButtonSize = "sm" | "md";

/** Class fragments both platforms build their button out of. */
export const toneClasses: Record<ButtonTone, string> = {
  primary: "bg-moss",
  secondary: "border border-moss bg-paper",
  quiet: "bg-moss-pale",
  danger: "bg-berry",
};

export const labelClasses: Record<ButtonTone, string> = {
  primary: "text-paper",
  secondary: "text-moss",
  quiet: "text-moss",
  danger: "text-paper",
};

export const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-10 px-4",
  md: "min-h-13 px-5",
};
