import type { Task } from "@/types/task";

// Dates are generated relative to "now" (not hardcoded) so the list always
// shows a realistic mix of overdue/today/upcoming tasks whenever the app runs.
function offsetDate(days: number, hour: number, minute = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function hoursAgo(hours: number): string {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date.toISOString();
}

export const tasks: Task[] = [
  {
    id: "tax-documents",
    title: "Submit tax documents",
    category: "other",
    status: "pending",
    priorityScore: 88,
    dueDate: offsetDate(-5, 17),
    estimatedMinutes: 45,
    createdAt: hoursAgo(20 * 24),
  },
  {
    id: "car-insurance",
    title: "Renew car insurance",
    category: "personal",
    status: "pending",
    priorityScore: 81,
    dueDate: offsetDate(-1, 9),
    estimatedMinutes: 20,
    createdAt: hoursAgo(15 * 24),
  },
  {
    id: "quarterly-report",
    title: "Finish quarterly report",
    category: "work",
    status: "pending",
    priorityScore: 95,
    dueDate: offsetDate(0, 18),
    estimatedMinutes: 120,
    createdAt: hoursAgo(3 * 24),
  },
  {
    id: "chemistry-test",
    title: "Study for chemistry test",
    category: "school",
    status: "pending",
    priorityScore: 92,
    dueDate: offsetDate(1, 9),
    estimatedMinutes: 90,
    createdAt: hoursAgo(2 * 24),
  },
  {
    id: "weekly-groceries",
    title: "Buy weekly groceries",
    category: "personal",
    status: "pending",
    priorityScore: 58,
    dueDate: offsetDate(1, 19),
    estimatedMinutes: 30,
    createdAt: hoursAgo(24),
  },
  {
    id: "email-professor",
    title: "Email professor about extension",
    category: "school",
    status: "pending",
    priorityScore: 70,
    dueDate: offsetDate(3, 12),
    estimatedMinutes: 10,
    createdAt: hoursAgo(4 * 24),
  },
  {
    id: "client-proposal-slides",
    title: "Prep client proposal slides",
    category: "work",
    status: "pending",
    priorityScore: 76,
    dueDate: offsetDate(3, 15),
    estimatedMinutes: 60,
    createdAt: hoursAgo(6),
  },
  {
    id: "clean-garage",
    title: "Clean out garage",
    category: "other",
    status: "pending",
    priorityScore: 30,
    dueDate: offsetDate(5, 10),
    estimatedMinutes: 90,
    createdAt: hoursAgo(5 * 24),
  },
  {
    id: "weekend-trip",
    title: "Plan weekend trip",
    category: "personal",
    status: "pending",
    priorityScore: 40,
    dueDate: offsetDate(6, 20),
    estimatedMinutes: 45,
    createdAt: hoursAgo(2 * 24),
  },
  {
    id: "reading-chapters",
    title: "Read assigned chapters 4-6",
    category: "school",
    status: "pending",
    priorityScore: 52,
    dueDate: offsetDate(9, 21),
    estimatedMinutes: 60,
    createdAt: hoursAgo(3 * 24),
  },
  {
    id: "portfolio-website",
    title: "Update portfolio website",
    category: "work",
    status: "pending",
    priorityScore: 35,
    dueDate: offsetDate(14, 17),
    estimatedMinutes: 120,
    createdAt: hoursAgo(10 * 24),
  },
  {
    id: "digital-photos",
    title: "Organize digital photos",
    category: "other",
    status: "pending",
    priorityScore: 22,
    dueDate: offsetDate(21, 12),
    estimatedMinutes: 45,
    createdAt: hoursAgo(12 * 24),
  },
  {
    id: "morning-run",
    title: "Morning run",
    category: "personal",
    status: "completed",
    priorityScore: 48,
    dueDate: offsetDate(-1, 7),
    estimatedMinutes: 30,
    createdAt: hoursAgo(2 * 24),
  },
  {
    id: "expense-report",
    title: "Submit expense report",
    category: "work",
    status: "completed",
    priorityScore: 85,
    dueDate: offsetDate(-2, 17),
    estimatedMinutes: 20,
    createdAt: hoursAgo(6 * 24),
  },
  {
    id: "reading-assignment",
    title: "Finish reading assignment",
    category: "school",
    status: "completed",
    priorityScore: 66,
    dueDate: offsetDate(-3, 21),
    estimatedMinutes: 40,
    createdAt: hoursAgo(8 * 24),
  },
  {
    id: "water-plants",
    title: "Water the plants",
    category: "other",
    status: "completed",
    priorityScore: 15,
    dueDate: offsetDate(-4, 8),
    estimatedMinutes: 10,
    createdAt: hoursAgo(9 * 24),
  },
];
