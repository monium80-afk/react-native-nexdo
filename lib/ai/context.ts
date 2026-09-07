import type { Task } from "@/types/task";

// Context-budgeting: pick a small, relevant slice of the task list to reason
// over instead of ever handing "the whole database" to the classifier.
export function selectRelevantTasks(
  text: string,
  tasks: Task[],
  recentTaskIds: string[],
  currentTaskId: string | undefined,
  limit = 8,
): Task[] {
  const pending = tasks.filter((task) => task.status === "pending");
  const selected: Task[] = [];
  const seen = new Set<string>();

  const add = (task: Task | undefined) => {
    if (!task || seen.has(task.id)) return;
    seen.add(task.id);
    selected.push(task);
  };

  add(pending.find((task) => task.id === currentTaskId));
  recentTaskIds.forEach((id) => add(pending.find((task) => task.id === id)));

  const lower = text.toLowerCase();
  pending
    .filter((task) => lower.includes(task.title.toLowerCase()))
    .forEach((task) => add(task));

  const byPriority = [...pending].sort((a, b) => b.priorityScore - a.priorityScore);
  for (const task of byPriority) {
    if (selected.length >= limit) break;
    add(task);
  }

  return selected.slice(0, limit);
}
