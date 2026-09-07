// Small heuristic date-phrase parser shared by extraction and intent
// classification. Handles the phrasing this mock layer is documented to
// support (today/tomorrow/weekend/weekday names/"in N days") — not general NLU.
export function parseDatePhrase(text: string, now: Date = new Date()): string | undefined {
  const lower = text.toLowerCase();

  const setTime = (date: Date, hour = 18) => {
    date.setHours(hour, 0, 0, 0);
    return date;
  };

  if (/\btomorrow\b/.test(lower)) {
    const date = new Date(now);
    date.setDate(date.getDate() + 1);
    return setTime(date).toISOString();
  }

  if (/\btoday\b|\btonight\b/.test(lower)) {
    return setTime(new Date(now), /tonight/.test(lower) ? 20 : 18).toISOString();
  }

  if (/\bthis weekend\b/.test(lower)) {
    const date = new Date(now);
    date.setDate(date.getDate() + ((6 - date.getDay() + 7) % 7));
    return setTime(date, 12).toISOString();
  }

  const inDaysMatch = lower.match(/\bin (\d+) days?\b/);
  if (inDaysMatch) {
    const date = new Date(now);
    date.setDate(date.getDate() + Number.parseInt(inDaysMatch[1], 10));
    return setTime(date).toISOString();
  }

  const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  for (let i = 0; i < weekdays.length; i += 1) {
    if (new RegExp(`\\b${weekdays[i]}\\b`).test(lower)) {
      const date = new Date(now);
      const diff = (i - date.getDay() + 7) % 7 || 7; // next occurrence, never "today"
      date.setDate(date.getDate() + diff);
      return setTime(date).toISOString();
    }
  }

  const nextWeekMatch = /\bnext week\b/.test(lower);
  if (nextWeekMatch) {
    const date = new Date(now);
    date.setDate(date.getDate() + 7);
    return setTime(date).toISOString();
  }

  return undefined;
}
