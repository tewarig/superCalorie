export interface InputProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  label?: string;
  /** Maps to the right keyboard on native and the right input type on web. */
  type?: "text" | "email" | "password" | "number";
  autoFocus?: boolean;
  editable?: boolean;
  /** Submit affordance: Enter on web, the keyboard's return key on native. */
  onSubmit?: () => void;
}
