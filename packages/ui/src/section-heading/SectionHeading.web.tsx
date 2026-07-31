export function SectionHeading({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="mt-lg flex items-end justify-between">
      <h2 className="font-display text-2xl text-ink">{title}</h2>
      {detail ? <span className="font-bold text-xs uppercase tracking-label text-muted">{detail}</span> : null}
    </div>
  );
}
