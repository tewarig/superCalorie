import { Tracker } from "@/components/tracker";

export const metadata = { title: "Today — superCalorie" };

/**
 * No auth gate and no server read. Everything this page needs lives on the
 * device, so it works with the backend switched off entirely.
 */
export default function TodayPage() {
  return <Tracker />;
}
