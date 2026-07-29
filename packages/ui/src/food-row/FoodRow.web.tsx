import { AppButton } from "../app-button/AppButton.web";
import { initial, rowClasses, type FoodResultRowProps, type LoggedFoodRowProps } from "./types";

export function FoodResultRow({ name, meta, source, onHalf, onAdd, divider = true }: FoodResultRowProps) {
  return (
    <div className={`flex items-center gap-2 ${rowClasses(divider)}`}>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-base text-ink">{name}</p>
        <p className="mt-0.5 text-xs text-muted">
          <span className="font-bold uppercase text-citrus">{source}</span>
          {"  "}
          {meta}
        </p>
      </div>
      <AppButton onClick={onHalf} size="sm" tone="quiet">
        ½
      </AppButton>
      <AppButton onClick={onAdd} size="sm">
        Add
      </AppButton>
    </div>
  );
}

export function LoggedFoodRow({ name, meta, calories, photoUri, onRemove, divider = true }: LoggedFoodRowProps) {
  return (
    <div className={`flex items-center gap-3 ${rowClasses(divider)}`}>
      {photoUri ? (
        // eslint-disable-next-line @next/next/no-img-element -- photos are
        // user uploads served from the local store, and next/image would
        // pull a Next-only dependency into a package the mobile app builds.
        <img alt={`${name} photo`} className="h-11 w-11 rounded-control border border-line object-cover" src={photoUri} />
      ) : (
        <div className="flex h-11 w-11 items-center justify-center rounded-control bg-moss-pale">
          <span className="font-display text-xl text-moss">{initial(name)}</span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-base text-ink">{name}</p>
        <p className="mt-0.5 text-xs text-muted">{meta}</p>
      </div>
      <span className="font-display text-xl text-ink">{calories}</span>
      <button
        aria-label={`Remove ${name}`}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-berry-pale font-bold text-base text-berry"
        onClick={onRemove}
        type="button"
      >
        ×
      </button>
    </div>
  );
}
