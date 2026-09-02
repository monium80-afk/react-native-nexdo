import { colors } from "@/constants/theme";
import type { TaskCategory } from "@/types/task";

export const CATEGORY_META: Record<TaskCategory, { label: string; badgeClass: string; dotColor: string }> = {
  work: { label: "Work", badgeClass: "badge--work", dotColor: colors.category.work[500] },
  school: { label: "School", badgeClass: "badge--school", dotColor: colors.category.school[500] },
  personal: { label: "Personal", badgeClass: "badge--personal", dotColor: colors.category.personal[500] },
  other: { label: "Other", badgeClass: "badge--other", dotColor: colors.category.other[500] },
};
