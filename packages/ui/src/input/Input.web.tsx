"use client";

import { useState } from "react";
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
    <label style={{ display: "block", width: "100%" }}>
      {label && (
        <span
          style={{
            display: "block",
            marginBottom: space.sm,
            fontSize: fontSize.sm,
            fontWeight: 600,
            color: color.textMuted,
          }}
        >
          {label}
        </span>
      )}
      <input
        value={value}
        onChange={(event) => onChangeText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && onSubmit) {
            event.preventDefault();
            onSubmit();
          }
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        type={type}
        autoFocus={autoFocus}
        disabled={!editable}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: `${space.md}px ${space.lg}px`,
          fontFamily: "inherit",
          fontSize: fontSize.md,
          color: color.text,
          backgroundColor: editable ? color.surface : color.surfaceMuted,
          border: `1px solid ${focused ? color.primary : color.border}`,
          borderRadius: radius.md,
          outline: "none",
          boxShadow: focused ? `0 0 0 3px ${color.primarySubtle}` : "none",
          transition: "border-color 140ms ease, box-shadow 140ms ease",
        }}
      />
    </label>
  );
}

export type { InputProps } from "./types";
