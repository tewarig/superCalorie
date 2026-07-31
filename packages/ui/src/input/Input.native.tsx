import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { color, fontSize, radius, space } from "../tokens";
import type { InputProps } from "./types";

export function Input({
  value,
  onChangeText,
  placeholder,
  label,
  type = "text",
  autoFocus = false,
  editable = true,
  onSubmit,
}: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={color.textFaint}
        autoFocus={autoFocus}
        editable={editable}
        secureTextEntry={type === "password"}
        autoCapitalize={type === "email" || type === "password" ? "none" : "sentences"}
        autoCorrect={type !== "email" && type !== "password"}
        keyboardType={type === "email" ? "email-address" : type === "number" ? "numeric" : "default"}
        returnKeyType={onSubmit ? "go" : "done"}
        style={[
          styles.input,
          focused && styles.inputFocused,
          !editable && { backgroundColor: color.surfaceMuted },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },
  label: {
    marginBottom: space.sm,
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: color.textMuted,
  },
  input: {
    width: "100%",
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    fontSize: fontSize.base,
    color: color.text,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.control,
  },
  inputFocused: {
    borderColor: color.primary,
  },
});

export type { InputProps } from "./types";
