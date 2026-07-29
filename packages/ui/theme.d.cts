export type ColorScale = { DEFAULT: string; [shade: string]: string };

export declare const colors: Record<string, string | ColorScale>;
export declare const borderRadius: Record<string, string>;
export declare const fontFamily: Record<string, string[]>;

/** Flattened `name -> hex`, e.g. `moss`, `moss-pale`. */
export declare function flatColors(): Record<string, string>;
