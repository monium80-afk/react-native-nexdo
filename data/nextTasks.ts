import type { NextTask } from "@/types/task";

export const nextTasks: NextTask[] = [
  {
    id: "chem-test",
    title: "Study for chemistry test",
    category: "school",
    priorityScore: 90,
    dueLabel: "Due Tomorrow",
    estimatedMinutes: 90,
    whyThis: {
      reasoning:
        "This is a high-priority task because the test is scheduled for tomorrow, requiring immediate preparation.",
      keyFocus:
        'Immediate step: "Review lecture notes and identify key formulas/concepts" (20 min)',
    },
  },
  {
    id: "client-proposal",
    title: "Finish client proposal draft",
    category: "work",
    priorityScore: 78,
    dueLabel: "Due Today",
    estimatedMinutes: 60,
    whyThis: {
      reasoning:
        "The proposal is due today and unblocks the client call scheduled this afternoon.",
      keyFocus:
        'Immediate step: "Outline the pricing section and send it for review" (15 min)',
    },
  },
  {
    id: "evening-workout",
    title: "Evening workout session",
    category: "personal",
    priorityScore: 52,
    dueLabel: "Due Tonight",
    estimatedMinutes: 45,
    whyThis: {
      reasoning:
        "You haven't logged a workout in 3 days, and tonight is the last open slot this week.",
      keyFocus: 'Immediate step: "Change into workout clothes and warm up" (5 min)',
    },
  },
];
