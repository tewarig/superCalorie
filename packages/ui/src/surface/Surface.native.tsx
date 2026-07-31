import { View, type ViewProps } from "react-native";

export function Surface({ className, ...props }: ViewProps) {
  return <View className={`rounded-card border border-line bg-paper p-lg ${className ?? ""}`} {...props} />;
}
