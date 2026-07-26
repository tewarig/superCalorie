/**
 * Dates are handled in the *user's* local timezone, never UTC — a meal
 * logged at 11pm belongs to that day, not tomorrow. Clients compute the
 * date string and send it along; the server only falls back to its own
 * clock when one is missing.
 */
export function todayISO(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateLabel(iso: string, today = todayISO()): string {
  if (iso === today) return "Today";

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (iso === todayISO(yesterday)) return "Yesterday";

  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
