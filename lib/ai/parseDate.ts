// Heuristic date-phrase parser shared by task extraction and intent
// classification. The Gemini path never computes dates itself — it copies
// the user's deadline wording verbatim into dueDatePhrase and this resolves
// it (see app/api/inbox+api.ts) — so anything this can't parse silently
// becomes "no deadline". That makes breadth here worth more than precision:
// it covers the phrasings people actually type, including past ones
// ("last week") that should land as overdue, not as no deadline at all.
// Returns undefined only when the text names no deadline whatsoever.

const DEFAULT_HOUR = 18;

const COUNT_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  couple: 2,
  three: 3,
  few: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

const COUNT_PATTERN = `\\d+|${Object.keys(COUNT_WORDS).join("|")}`;

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

type TimeOfDay = { hour: number; minute: number };

function toCount(word: string | undefined): number | undefined {
  if (!word) return undefined;
  const digits = Number.parseInt(word, 10);
  if (!Number.isNaN(digits)) return digits;
  return COUNT_WORDS[word];
}

// "at 5", "5pm", "17:30", "noon", "tomorrow morning" — the time rides along
// with whichever day the phrase resolves to, so "today at 3pm" and "friday
// at 9am" both keep the hour the user actually said.
function extractTimeOfDay(lower: string): TimeOfDay | undefined {
  if (/\b(noon|midday)\b/.test(lower)) return { hour: 12, minute: 0 };
  if (/\bmidnight\b/.test(lower)) return { hour: 0, minute: 0 };

  const meridiem = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (meridiem) {
    const hour12 = Number.parseInt(meridiem[1], 10) % 12;
    return {
      hour: meridiem[3] === "pm" ? hour12 + 12 : hour12,
      minute: meridiem[2] ? Number.parseInt(meridiem[2], 10) : 0,
    };
  }

  const clock = lower.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\b/);
  if (clock) {
    const hour = Number.parseInt(clock[1], 10);
    const minute = clock[2] ? Number.parseInt(clock[2], 10) : 0;
    if (hour <= 23 && minute <= 59) {
      // A bare "at 7" means the evening far more often than 7am; hours that
      // can only be one thing on a 24h clock are left alone.
      return { hour: clock[2] === undefined && hour >= 1 && hour <= 7 ? hour + 12 : hour, minute };
    }
  }

  if (/\bmorning\b/.test(lower)) return { hour: 9, minute: 0 };
  if (/\bafternoon\b/.test(lower)) return { hour: 14, minute: 0 };
  if (/\b(evening|tonight)\b/.test(lower)) return { hour: 20, minute: 0 };
  return undefined;
}

export function parseDatePhrase(text: string, now: Date = new Date()): string | undefined {
  const lower = text.toLowerCase();
  const time = extractTimeOfDay(lower);

  const resolve = (date: Date, fallbackHour = DEFAULT_HOUR): string | undefined => {
    date.setHours(time?.hour ?? fallbackHour, time?.minute ?? 0, 0, 0);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  };

  const byDays = (days: number): Date => {
    const date = new Date(now);
    date.setDate(date.getDate() + days);
    return date;
  };

  const byMonths = (months: number): Date => {
    const date = new Date(now);
    date.setMonth(date.getMonth() + months);
    return date;
  };

  // Checked before "tomorrow" — it contains the word.
  if (/\bday after tomorrow\b/.test(lower)) return resolve(byDays(2));
  // Misspelling this is common enough ("tommorow", "tomorow") that matching
  // only the correct spelling loses real deadlines.
  if (/\btom+or+ow\b/.test(lower)) return resolve(byDays(1));
  if (/\byesterday\b/.test(lower)) return resolve(byDays(-1));
  if (/\b(today|tonight|this evening|this afternoon|this morning)\b/.test(lower)) return resolve(new Date(now));
  if (/\basap\b|\bright now\b|\bimmediately\b/.test(lower)) return resolve(new Date(now));

  const ago = lower.match(new RegExp(`\\b(${COUNT_PATTERN})\\s+(day|week|month|hour)s?\\s+ago\\b`));
  if (ago) {
    const count = toCount(ago[1]);
    if (count !== undefined) {
      if (ago[2] === "hour") return resolve(new Date(now.getTime() - count * 60 * 60 * 1000));
      if (ago[2] === "month") return resolve(byMonths(-count));
      return resolve(byDays(ago[2] === "week" ? -count * 7 : -count));
    }
  }

  const within = lower.match(new RegExp(`\\bin\\s+(?:the\\s+next\\s+)?(${COUNT_PATTERN})\\s+(day|week|month|hour|minute)s?\\b`));
  if (within) {
    const count = toCount(within[1]);
    if (count !== undefined) {
      if (within[2] === "minute") return resolve(new Date(now.getTime() + count * 60 * 1000));
      if (within[2] === "hour") return resolve(new Date(now.getTime() + count * 60 * 60 * 1000));
      if (within[2] === "month") return resolve(byMonths(count));
      return resolve(byDays(within[2] === "week" ? count * 7 : count));
    }
  }

  if (/\blast week\b/.test(lower)) return resolve(byDays(-7));
  if (/\blast month\b/.test(lower)) return resolve(byMonths(-1));
  if (/\bnext month\b/.test(lower)) return resolve(byMonths(1));

  if (/\bnext weekend\b/.test(lower)) {
    const date = byDays(7);
    date.setDate(date.getDate() + ((6 - date.getDay() + 7) % 7));
    return resolve(date, 12);
  }

  if (/\b(this |the )?weekend\b/.test(lower)) {
    const date = new Date(now);
    date.setDate(date.getDate() + ((6 - date.getDay() + 7) % 7));
    return resolve(date, 12);
  }

  if (/\bend of (the )?month\b/.test(lower)) {
    const date = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return resolve(date);
  }

  if (/\b(end of (the )?week|by friday)\b/.test(lower)) {
    const date = new Date(now);
    date.setDate(date.getDate() + ((5 - date.getDay() + 7) % 7));
    return resolve(date);
  }

  if (/\bnext week\b/.test(lower)) return resolve(byDays(7));

  for (let i = 0; i < WEEKDAYS.length; i += 1) {
    if (!new RegExp(`\\b${WEEKDAYS[i]}\\b`).test(lower)) continue;
    const date = new Date(now);
    if (new RegExp(`\\blast\\s+${WEEKDAYS[i]}\\b`).test(lower)) {
      const diff = (date.getDay() - i + 7) % 7 || 7; // most recent past one
      date.setDate(date.getDate() - diff);
      return resolve(date);
    }
    const diff = (i - date.getDay() + 7) % 7 || 7; // next occurrence, never today
    date.setDate(date.getDate() + (new RegExp(`\\bnext\\s+${WEEKDAYS[i]}\\b`).test(lower) ? diff + 7 : diff));
    return resolve(date);
  }

  // A bare clock time with no day ("gym at 6pm") means today, or tomorrow
  // if that hour has already passed. Only explicit clock times qualify —
  // "morning"/"evening" alone are too weak to invent a deadline from.
  if (time && /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)|at\s+\d{1,2}(?::\d{2})?|noon|midnight)\b/.test(lower)) {
    const today = resolve(new Date(now));
    if (today && new Date(today).getTime() >= now.getTime()) return today;
    return resolve(byDays(1));
  }

  const iso = lower.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) {
    return resolve(new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
  }

  // "march 5", "5 march", "sept 20" — the year is whichever keeps it closest
  // to now, so a month already past this year reads as next year.
  for (let i = 0; i < MONTHS.length; i += 1) {
    const name = `${MONTHS[i].slice(0, 3)}[a-z]*`;
    const match = lower.match(new RegExp(`\\b(?:${name}\\s+(\\d{1,2})|(\\d{1,2})\\s+${name})\\b`));
    if (!match) continue;
    const day = Number.parseInt(match[1] ?? match[2], 10);
    if (!day || day > 31) continue;
    const date = new Date(now.getFullYear(), i, day);
    if (date.getTime() < now.getTime() - 180 * 24 * 60 * 60 * 1000) date.setFullYear(date.getFullYear() + 1);
    return resolve(date);
  }

  return undefined;
}
