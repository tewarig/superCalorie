type Divided = {
  /**
   * Draws the hairline above the row.
   *
   * This is a prop rather than a `first:` variant because NativeWind has no
   * `first:` on native — the rule needs a sibling selector, which there is no
   * equivalent of in the style system. The list knows its own indices, so it
   * passes `divider={index > 0}` and both platforms agree.
   */
  divider?: boolean;
};

export type FoodResultRowProps = Divided & {
  name: string;
  meta: string;
  source: string;
  onHalf: () => void;
  onAdd: () => void;
};

export type LoggedFoodRowProps = Divided & {
  name: string;
  meta: string;
  calories: number;
  photoUri: string | null;
  onRemove: () => void;
};

export function rowClasses(divider: boolean): string {
  return divider ? "border-t border-line py-4" : "py-4";
}

/** Fallback avatar glyph when an entry has no photo. */
export function initial(name: string): string {
  return name.slice(0, 1).toUpperCase();
}
