export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  const minsLabel = mins === 1 ? "min" : "mins";

  if (hours === 0) return `${mins} ${minsLabel}`;
  if (mins === 0) return `${hours} hour${hours > 1 ? "s" : ""}`;
  return `${hours} hour${hours > 1 ? "s" : ""} ${mins} ${minsLabel}`;
}
