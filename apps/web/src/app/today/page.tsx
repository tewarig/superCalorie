import { getSessionUser, publicUser } from "@/lib/auth";
import { DayView } from "@/components/day-view";
import { redirect } from "next/navigation";

export const metadata = { title: "Today — superCalorie" };

export default async function TodayPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  // The day itself is loaded client-side, because only the browser knows
  // the user's timezone — a meal logged at 11pm belongs to that day.
  return <DayView user={publicUser(user)} />;
}
