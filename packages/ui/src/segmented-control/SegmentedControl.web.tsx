import type { SegmentedControlProps } from "./types";

export type { Segment, SegmentedControlProps } from "./types";

export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            aria-checked={active}
            className={`rounded-full px-4 py-2.5 font-bold text-xs ${active ? "bg-moss text-paper" : "border border-line bg-paper text-muted"}`}
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
