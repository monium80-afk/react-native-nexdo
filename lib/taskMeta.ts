import type { Task } from "@/types/task";

export type ScoreTier = "high" | "medium" | "low";

// Thresholds mirror prompt_material/01-design-system.txt's urgency scale.
export function getScoreTier(score: number): ScoreTier {
  if (score >= 75) return "high";
  if (score >= 45) return "medium";
  return "low";
}

export type DueTone = "overdue" | "urgent" | "upcoming" | "muted";

export type DueInfo = {
  label: string;
  tone: DueTone;
  pillLabel: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function getDueInfo(task: Task, now: Date = new Date()): DueInfo {
  if (task.status === "completed") {
    return { label: "Completed", tone: "muted", pillLabel: "Completed" };
  }

  const due = new Date(task.dueDate);
  const dayDiff = Math.round((startOfDay(due).getTime() - startOfDay(now).getTime()) / DAY_MS);
  const time = formatTime(due);

  if (dayDiff < 0) {
    const daysOverdue = Math.abs(dayDiff);
    return {
      label: `${daysOverdue}d overdue`,
      tone: "overdue",
      pillLabel: `Due ${daysOverdue === 1 ? "yesterday" : `${daysOverdue} days ago`} at ${time}`,
    };
  }

  if (dayDiff === 0) {
    return { label: "Due today", tone: "urgent", pillLabel: `Due today by ${time}` };
  }

  if (dayDiff === 1) {
    return { label: "Due tomorrow", tone: "urgent", pillLabel: `Due tomorrow at ${time}` };
  }

  if (dayDiff <= 6) {
    const weekday = due.toLocaleDateString("en-US", { weekday: "long" });
    return { label: `In ${dayDiff} days`, tone: "upcoming", pillLabel: `Due ${weekday} at ${time}` };
  }

  const dateLabel = due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return { label: `In ${dayDiff} days`, tone: "upcoming", pillLabel: `Due ${dateLabel} at ${time}` };
}
