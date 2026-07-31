import type { HTMLAttributes } from "react";

export function Surface({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-card border border-line bg-paper p-lg ${className ?? ""}`} {...props} />;
}
