import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FilterSheet } from "@/components/FilterSheet";
import { TaskCard } from "@/components/TaskCard";
import { colors } from "@/constants/theme";
import { getDueInfo } from "@/lib/taskMeta";
import { useTaskFilterStore, type TaskSortOption, type TaskStatusFilter } from "@/store/useTaskFilterStore";
import { useTaskStore } from "@/store/useTaskStore";
import type { Task, TaskCategory } from "@/types/task";

const CATEGORY_TABS: { label: string; value: TaskCategory | "all" }[] = [
  { label: "All", value: "all" },
  { label: "School", value: "school" },
  { label: "Work", value: "work" },
  { label: "Personal", value: "personal" },
  { label: "Other", value: "other" },
];

const STATUS_OPTIONS: { label: string; value: TaskStatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Completed", value: "completed" },
  { label: "Overdue", value: "overdue" },
];

const SORT_OPTIONS: { label: string; value: TaskSortOption }[] = [
  { label: "Recently added", value: "recent" },
  { label: "Due date", value: "dueDate" },
  { label: "Priority score", value: "priority" },
  { label: "Title (A–Z)", value: "alphabetical" },
];

function compareBySort(a: Task, b: Task, sort: TaskSortOption): number {
  switch (sort) {
    case "dueDate":
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    case "priority":
      return b.priorityScore - a.priorityScore;
    case "alphabetical":
      return a.title.localeCompare(b.title);
    case "recent":
    default:
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }
}

function sortTasks(list: Task[], sort: TaskSortOption): Task[] {
  return [...list].sort((a, b) => {
    // Completed tasks always sink below pending ones, whatever the chosen sort.
    if (a.status !== b.status) return a.status === "completed" ? 1 : -1;
    return compareBySort(a, b, sort);
  });
}

function TaskDetailPlaceholder({ taskId, note, mode }: { taskId?: string; note?: string; mode?: string }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream[100] }}>
      <View className="flex-1 items-center justify-center gap-2 px-6">
        <Text className="text-title text-ink-cream">{mode === "plan" ? "Plan Task" : "Tasks"}</Text>
        {taskId ? <Text className="text-body text-ink-cream-muted">Task: {taskId}</Text> : null}
        {note ? <Text className="text-body text-ink-cream-muted">Note: {note}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

function TasksListScreen() {
  const router = useRouter();
  const tasks = useTaskStore((state) => state.tasks);
  const toggleTaskStatus = useTaskStore((state) => state.toggleTaskStatus);
  const { category, status, sort, search, setCategory, setStatus, setSort, setSearch } =
    useTaskFilterStore();

  const [searchOpen, setSearchOpen] = useState(false);
  const [statusSheetOpen, setStatusSheetOpen] = useState(false);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);

  const pendingCount = tasks.filter((task) => task.status === "pending").length;
  const completedCount = tasks.filter((task) => task.status === "completed").length;
  const overdueCount = tasks.filter((task) => getDueInfo(task).tone === "overdue").length;

  const categoryCounts = useMemo(() => {
    const counts: Record<TaskCategory | "all", number> = {
      all: tasks.length,
      work: 0,
      school: 0,
      personal: 0,
      other: 0,
    };
    for (const task of tasks) counts[task.category] += 1;
    return counts;
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = tasks.filter((task) => {
      if (category !== "all" && task.category !== category) return false;
      if (status === "pending" && task.status !== "pending") return false;
      if (status === "completed" && task.status !== "completed") return false;
      if (status === "overdue" && getDueInfo(task).tone !== "overdue") return false;
      if (query && !task.title.toLowerCase().includes(query)) return false;
      return true;
    });
    return sortTasks(filtered, sort);
  }, [tasks, category, status, sort, search]);

  const statusLabel = STATUS_OPTIONS.find((option) => option.value === status)?.label ?? "All";
  const sortLabel = SORT_OPTIONS.find((option) => option.value === sort)?.label ?? "Recently added";

  const handleOpenTask = (taskId: string) => {
    router.push({ pathname: "/(tabs)/tasks", params: { taskId } });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.charcoal[900] }} edges={["top"]}>
      <View className="gap-4 bg-charcoal-900 px-6 pb-5 pt-2">
        <View className="flex-row items-center justify-between gap-3">
          <Text className="text-title text-ink-charcoal">Tasks</Text>
          <View className="flex-row items-center gap-2.5">
            <Pressable
              onPress={() => setSearchOpen((open) => !open)}
              hitSlop={8}
              className="h-11 w-11 items-center justify-center rounded-full bg-charcoal-800"
            >
              <Feather name={searchOpen ? "x" : "search"} size={18} color={colors.ink.charcoal} />
            </Pressable>
            <Pressable
              onPress={() => router.push("/(tabs)/add")}
              className="btn btn--primary flex-row gap-2"
            >
              <Feather name="plus" size={16} color={colors.cream[50]} />
              <Text className="font-grotesk-bold text-sm text-cream-50">Add Task</Text>
            </Pressable>
          </View>
        </View>

        {searchOpen ? (
          <View className="flex-row items-center gap-2 rounded-full border border-charcoal-600 bg-charcoal-800 px-4 py-2.5">
            <Feather name="search" size={16} color={colors.ink.charcoalMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search tasks..."
              placeholderTextColor={colors.ink.charcoalMuted}
              autoFocus
              className="flex-1 font-grotesk-regular text-sm text-ink-charcoal"
            />
          </View>
        ) : (
          <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
            <Text className="font-grotesk-medium text-sm text-ink-charcoal-muted">
              <Text className="font-grotesk-bold text-ink-charcoal">{pendingCount}</Text> pending,{" "}
              <Text className="font-grotesk-bold text-ink-charcoal">{completedCount}</Text> completed
            </Text>
            {overdueCount > 0 ? (
              <Text className="font-grotesk-semibold text-sm text-overdue-500">
                • {overdueCount} overdue
              </Text>
            ) : null}
          </View>
        )}
      </View>

      <ScrollView
        className="bg-cream-100"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, gap: 8 }}
        >
          {CATEGORY_TABS.map((tab) => {
            const active = tab.value === category;
            return (
              <Pressable
                key={tab.value}
                onPress={() => setCategory(tab.value)}
                className={
                  active
                    ? "flex-row items-center gap-1.5 rounded-full bg-cream-50 px-4 py-2.5"
                    : "flex-row items-center gap-1.5 rounded-full px-4 py-2.5"
                }
              >
                <Text
                  className={
                    active
                      ? "font-grotesk-semibold text-sm text-ink-cream"
                      : "font-grotesk-medium text-sm text-ink-cream-muted"
                  }
                >
                  {tab.label}
                </Text>
                <View
                  className={
                    active ? "rounded-full bg-orange-100 px-2 py-0.5" : "rounded-full bg-cream-200 px-2 py-0.5"
                  }
                >
                  <Text className="font-grotesk-bold text-xs text-ink-cream">{categoryCounts[tab.value]}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <View className="flex-row gap-3 px-6 pt-4">
          <Pressable
            onPress={() => setStatusSheetOpen(true)}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-full border border-cream-300 bg-cream-50 px-4 py-3"
          >
            <Feather name="filter" size={14} color={colors.ink.cream} />
            <Text className="font-grotesk-semibold text-sm text-ink-cream" numberOfLines={1}>
              Status: {statusLabel}
            </Text>
            <Feather name="chevron-down" size={14} color={colors.ink.creamMuted} />
          </Pressable>
          <Pressable
            onPress={() => setSortSheetOpen(true)}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-full border border-cream-300 bg-cream-50 px-4 py-3"
          >
            <Ionicons name="swap-vertical" size={14} color={colors.ink.cream} />
            <Text className="font-grotesk-semibold text-sm text-ink-cream" numberOfLines={1}>
              Sort: {sortLabel}
            </Text>
          </Pressable>
        </View>

        <Text className="px-6 pt-4 font-grotesk-medium text-sm text-ink-cream-muted">
          Showing <Text className="font-grotesk-bold text-ink-cream">{filteredTasks.length}</Text> of{" "}
          {tasks.length} tasks
        </Text>

        <View className="gap-4 px-6 pt-4">
          {filteredTasks.length === 0 ? (
            <View className="items-center gap-2 py-16">
              <Feather name="inbox" size={28} color={colors.ink.creamMuted} />
              <Text className="font-grotesk-semibold text-base text-ink-cream">No tasks found</Text>
              <Text className="text-body text-center text-ink-cream-muted">
                Try a different filter or search term.
              </Text>
            </View>
          ) : (
            filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onPress={() => handleOpenTask(task.id)}
                onToggle={() => toggleTaskStatus(task.id)}
              />
            ))
          )}
        </View>
      </ScrollView>

      <FilterSheet
        visible={statusSheetOpen}
        title="STATUS"
        options={STATUS_OPTIONS}
        selected={status}
        onSelect={setStatus}
        onClose={() => setStatusSheetOpen(false)}
      />
      <FilterSheet
        visible={sortSheetOpen}
        title="SORT BY"
        options={SORT_OPTIONS}
        selected={sort}
        onSelect={setSort}
        onClose={() => setSortSheetOpen(false)}
      />
    </SafeAreaView>
  );
}

export default function Tasks() {
  const { taskId, note, mode } = useLocalSearchParams<{
    taskId?: string;
    note?: string;
    mode?: string;
  }>();

  if (taskId || mode) {
    return <TaskDetailPlaceholder taskId={taskId} note={note} mode={mode} />;
  }

  return <TasksListScreen />;
}
