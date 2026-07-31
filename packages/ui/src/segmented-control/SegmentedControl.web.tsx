import type { SegmentedControlProps } from "./types";

export type { Segment, SegmentedControlProps } from "./types";

export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <div className="flex flex-wrap gap-sm" role="radiogroup">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            aria-checked={active}
            className={`rounded-full px-lg py-sm font-bold text-xs ${active ? "bg-primary text-paper" : "border border-line bg-paper text-muted"}`}
            key={option.value}
            onClick={() => onChange(option.value)}
            role="radio"
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
