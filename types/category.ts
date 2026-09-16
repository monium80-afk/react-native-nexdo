import type { colors } from "@/constants/theme";

export type CategoryColor = keyof typeof colors.category;

export type Category = {
  id: string;
  label: string;
  color: CategoryColor;
};
