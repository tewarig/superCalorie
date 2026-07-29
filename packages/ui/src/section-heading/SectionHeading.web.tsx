export function SectionHeading({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="mt-5 flex items-end justify-between">
      <h2 className="font-display text-2xl text-ink">{title}</h2>
      {detail ? <span className="font-bold text-xs uppercase tracking-wider text-muted">{detail}</span> : null}
    </div>
  );
}
