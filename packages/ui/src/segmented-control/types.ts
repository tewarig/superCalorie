export type Segment<T extends string> = { label: string; value: T };

export type SegmentedControlProps<T extends string> = {
  options: readonly Segment<T>[];
  value: T;
  onChange: (value: T) => void;
};
