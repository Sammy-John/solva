import { create } from "zustand";
import {
  Task,
  Person,
  Dependency,
  TaskStatus,
  Section,
  UserGroup,
} from "@/types/scheduling";
import {
  cascadeDependencies,
  recalcEndDate,
  recalcDuration,
  shouldAutoDelayTask,
  createsDependencyCycle,
  CascadeMovementSummary,
} from "@/lib/scheduling";

interface DependencyMutationResult {
  ok: boolean;
  error?: string;
}

interface ScheduleState {
  excludeWeekends: boolean;
  tasks: Task[];
  people: Person[];
  dependencies: Dependency[];
  sections: Section[];
  cascadeNotification: { message: string; affectedIds: string[]; details: string[] } | null;

  setScheduleData: (
    tasks: Task[],
    sections: Section[],
    dependencies: Dependency[],
    people: Person[],
  ) => void;

  addTask: (task: Task) => void;
  addTaskBelow: (sourceTaskId: string, task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  reorderTask: (
    taskId: string,
    targetTaskId: string | null,
    targetSectionId: string,
  ) => void;

  addSection: (name: string) => Section | null;
  deleteSection: (sectionId: string) => boolean;

  addPerson: (person: Person) => void;
  updatePerson: (id: string, updates: Partial<Person>) => void;
  removePerson: (id: string) => void;

  addDependency: (dep: Dependency) => DependencyMutationResult;
  updateDependency: (
    id: string,
    updates: Partial<Pick<Dependency, "predecessorId" | "successorId" | "lagDays" | "autoShift" | "notes">>,
  ) => DependencyMutationResult;
  removeDependency: (id: string) => void;

  setExcludeWeekends: (excludeWeekends: boolean) => void;
  dismissCascadeNotification: () => void;
}

const initialPeople: Person[] = [];
const initialTasks: Task[] = [];
const initialDependencies: Dependency[] = [];
const initialSections: Section[] = [];

const userGroupFromTaskType = (taskType: Task["taskType"]): UserGroup =>
  taskType === "Delivery" || taskType === "Ordering" ? "Suppliers" : "Internal";

const normalizeAssignedTo = (assignedTo: unknown): string[] => {
  if (Array.isArray(assignedTo)) {
    return assignedTo.filter(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    );
  }

  if (typeof assignedTo === "string" && assignedTo.trim().length > 0) {
    return [assignedTo];
  }

  return [];
};

const normalizeTask = (task: Task): Task => {
  const normalizedTask: Task = {
    ...task,
    assignedTo: normalizeAssignedTo(
      (task as { assignedTo?: unknown }).assignedTo,
    ),
    userGroup: userGroupFromTaskType(task.taskType),
  };

  if (shouldAutoDelayTask(normalizedTask)) {
    normalizedTask.status = "Delayed";
  }

  return normalizedTask;
};

const validateDependency = (
  dep: Pick<Dependency, "predecessorId" | "successorId">,
  tasks: Task[],
  dependencies: Dependency[],
  ignoreId?: string,
): string | null => {
  if (!dep.predecessorId || !dep.successorId) {
    return "Both predecessor and successor are required.";
  }

  if (dep.predecessorId === dep.successorId) {
    return "A task cannot depend on itself.";
  }

  const taskIds = new Set(tasks.map((task) => task.id));
  if (!taskIds.has(dep.predecessorId) || !taskIds.has(dep.successorId)) {
    return "Selected tasks no longer exist. Refresh and try again.";
  }

  const duplicate = dependencies.some(
    (existing) =>
      existing.id !== ignoreId &&
      existing.predecessorId === dep.predecessorId &&
      existing.successorId === dep.successorId,
  );

  if (duplicate) {
    return "This link already exists.";
  }

  if (
    createsDependencyCycle(
      dependencies,
      dep.predecessorId,
      dep.successorId,
      ignoreId,
    )
  ) {
    return "This link would create a loop in the schedule.";
  }

  return null;
};

const dependencyShiftNotification = (
  sourceTaskName: string,
  affectedIds: string[],
  movementSummaries: CascadeMovementSummary[],
): { message: string; affectedIds: string[]; details: string[] } | null => {
  if (affectedIds.length === 0) return null;

  const details = movementSummaries.slice(0, 3).map((summary) => {
    return `${summary.taskName}: ${summary.fromStartDate || "(none)"} -> ${summary.toStartDate} (because ${summary.constrainedByTaskName} must finish first${summary.lagDays > 0 ? ` + ${summary.lagDays} day${summary.lagDays === 1 ? "" : "s"}` : ""}).`;
  });

  return {
    message: `Cascade: ${sourceTaskName} moved ${affectedIds.length} task${affectedIds.length > 1 ? "s" : ""}.`,
    affectedIds,
    details,
  };
};

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  excludeWeekends: true,
  tasks: initialTasks,
  people: initialPeople,
  dependencies: initialDependencies,
  sections: initialSections,
  cascadeNotification: null,

  setScheduleData: (tasks, sections, dependencies, people) =>
    set({
      tasks: tasks.map(normalizeTask),
      sections,
      dependencies,
      people,
      cascadeNotification: null,
    }),

  addTask: (task) =>
    set((state) => ({ tasks: [...state.tasks, normalizeTask(task)] })),

  addTaskBelow: (sourceTaskId, task) =>
    set((state) => {
      const sourceIndex = state.tasks.findIndex((entry) => entry.id === sourceTaskId);
      const normalizedTask = normalizeTask(task);

      if (sourceIndex < 0) {
        return { tasks: [...state.tasks, normalizedTask] };
      }

      const nextTasks = [...state.tasks];
      nextTasks.splice(sourceIndex + 1, 0, normalizedTask);
      return { tasks: nextTasks };
    }),

  updateTask: (id, updates) => {
    const state = get();
    const tasks = state.tasks.map((task) => {
      if (task.id !== id) return task;
      const updated = { ...task, ...updates };

      if ("taskType" in updates && updates.taskType) {
        updated.userGroup = userGroupFromTaskType(updated.taskType);
      }

      const hasStartDate = Boolean(updated.startDate);
      const hasEndDate = Boolean(updated.endDate);

      if ("startDate" in updates && !("endDate" in updates)) {
        updated.endDate = hasStartDate
          ? recalcEndDate(updated.startDate, updated.duration, state.excludeWeekends)
          : "";
      } else if ("endDate" in updates && !("startDate" in updates)) {
        updated.duration =
          hasStartDate && hasEndDate
            ? recalcDuration(updated.startDate, updated.endDate, state.excludeWeekends)
            : 0;
      } else if ("duration" in updates && !("endDate" in updates)) {
        updated.endDate = hasStartDate
          ? recalcEndDate(updated.startDate, updated.duration, state.excludeWeekends)
          : "";
      }

      return updated;
    });

    const result = cascadeDependencies(
      tasks,
      state.dependencies,
      id,
      state.excludeWeekends,
    );

    let finalTasks = result.updatedTasks.map(normalizeTask);
    const affectedIds = [...result.affectedIds];

    if ("status" in updates && updates.status === "Delayed") {
      const cascadeDelayed = (taskId: string, visited: Set<string>) => {
        const successors = state.dependencies.filter(
          (dep) => dep.predecessorId === taskId,
        );

        for (const dependency of successors) {
          if (visited.has(dependency.successorId)) continue;
          visited.add(dependency.successorId);

          finalTasks = finalTasks.map((task) => {
            if (task.id === dependency.successorId && task.status !== "Completed") {
              if (!affectedIds.includes(task.id)) affectedIds.push(task.id);
              return { ...task, status: "Delayed" as TaskStatus };
            }
            return task;
          });

          cascadeDelayed(dependency.successorId, visited);
        }
      };

      cascadeDelayed(id, new Set([id]));
    }

    const notification = dependencyShiftNotification(
      result.sourceTaskName,
      affectedIds,
      result.movementSummaries,
    );

    set({ tasks: finalTasks, cascadeNotification: notification });
  },

  deleteTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
      dependencies: state.dependencies.filter(
        (dep) => dep.predecessorId !== id && dep.successorId !== id,
      ),
    })),

  reorderTask: (taskId, targetTaskId, targetSectionId) =>
    set((state) => {
      const sourceIndex = state.tasks.findIndex((task) => task.id === taskId);
      if (sourceIndex < 0) return state;

      const sourceTask = state.tasks[sourceIndex];
      const movingTask = { ...sourceTask, sectionId: targetSectionId };
      const remainingTasks = state.tasks.filter((task) => task.id !== taskId);

      if (!targetTaskId) {
        const insertIndex =
          remainingTasks.reduce(
            (lastIndex, task, index) =>
              task.sectionId === targetSectionId ? index : lastIndex,
            -1,
          ) + 1;
        remainingTasks.splice(insertIndex, 0, movingTask);
        return { tasks: remainingTasks };
      }

      const targetIndex = remainingTasks.findIndex(
        (task) => task.id === targetTaskId,
      );
      if (targetIndex < 0) {
        return { tasks: [...remainingTasks, movingTask] };
      }

      remainingTasks.splice(targetIndex, 0, movingTask);
      return { tasks: remainingTasks };
    }),

  addSection: (name) => {
    const trimmed = name.trim();
    if (!trimmed) return null;

    const state = get();
    const alreadyExists = state.sections.some(
      (section) => section.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (alreadyExists) return null;

    const nextSection: Section = {
      id: `sec-${Date.now()}`,
      name: trimmed,
      order: state.sections.length,
    };

    set({ sections: [...state.sections, nextSection] });
    return nextSection;
  },

  deleteSection: (sectionId) => {
    const state = get();
    const hasTasks = state.tasks.some((task) => task.sectionId === sectionId);
    if (hasTasks) {
      return false;
    }

    set({
      sections: state.sections
        .filter((section) => section.id !== sectionId)
        .map((section, index) => ({ ...section, order: index })),
    });
    return true;
  },

  addPerson: (person) =>
    set((state) => ({ people: [...state.people, person] })),

  updatePerson: (id, updates) =>
    set((state) => ({
      people: state.people.map((person) =>
        person.id === id ? { ...person, ...updates } : person,
      ),
    })),

  removePerson: (id) =>
    set((state) => ({
      people: state.people.filter((person) => person.id !== id),
      tasks: state.tasks.map((task) => ({
        ...task,
        assignedTo: task.assignedTo.filter((assignedId) => assignedId !== id),
      })),
    })),

  addDependency: (dep) => {
    const state = get();
    const validationError = validateDependency(dep, state.tasks, state.dependencies);
    if (validationError) {
      return { ok: false, error: validationError };
    }

    const normalizedDep: Dependency = {
      ...dep,
      lagDays: Math.max(0, Math.floor(dep.lagDays || 0)),
      notes: dep.notes?.trim() ?? "",
    };

    const newDependencies = [...state.dependencies, normalizedDep];
    const result = cascadeDependencies(
      state.tasks,
      newDependencies,
      normalizedDep.predecessorId,
      state.excludeWeekends,
    );

    set({
      dependencies: newDependencies,
      tasks: result.updatedTasks.map(normalizeTask),
      cascadeNotification: dependencyShiftNotification(
        result.sourceTaskName,
        result.affectedIds,
        result.movementSummaries,
      ),
    });

    return { ok: true };
  },

  updateDependency: (id, updates) => {
    const state = get();
    const existing = state.dependencies.find((dep) => dep.id === id);
    if (!existing) {
      return { ok: false, error: "Dependency not found." };
    }

    const candidate: Dependency = {
      ...existing,
      ...updates,
      lagDays: Math.max(0, Math.floor((updates.lagDays ?? existing.lagDays) || 0)),
      notes: (updates.notes ?? existing.notes ?? "").trim(),
    };

    const validationError = validateDependency(
      candidate,
      state.tasks,
      state.dependencies,
      id,
    );
    if (validationError) {
      return { ok: false, error: validationError };
    }

    const updatedDependencies = state.dependencies.map((dep) =>
      dep.id === id ? candidate : dep,
    );

    const result = cascadeDependencies(
      state.tasks,
      updatedDependencies,
      candidate.predecessorId,
      state.excludeWeekends,
    );

    set({
      dependencies: updatedDependencies,
      tasks: result.updatedTasks.map(normalizeTask),
      cascadeNotification: dependencyShiftNotification(
        result.sourceTaskName,
        result.affectedIds,
        result.movementSummaries,
      ),
    });

    return { ok: true };
  },

  removeDependency: (id) =>
    set((state) => ({
      dependencies: state.dependencies.filter((dep) => dep.id !== id),
    })),

  setExcludeWeekends: (excludeWeekends) =>
    set((state) => {
      const recalculatedTasks = state.tasks.map((task) => {
        if (!task.startDate) return task;
        const normalizedDuration = Math.max(0, Math.floor(task.duration || 0));
        if (normalizedDuration === 0) return task;

        return {
          ...task,
          endDate: recalcEndDate(task.startDate, normalizedDuration, excludeWeekends),
        };
      });

      let cascadedTasks = recalculatedTasks;
      const autoShiftRoots = Array.from(
        new Set(
          state.dependencies
            .filter((dep) => dep.autoShift)
            .map((dep) => dep.predecessorId),
        ),
      );

      for (const rootTaskId of autoShiftRoots) {
        const cascade = cascadeDependencies(
          cascadedTasks,
          state.dependencies,
          rootTaskId,
          excludeWeekends,
        );
        cascadedTasks = cascade.updatedTasks;
      }

      return {
        excludeWeekends,
        tasks: cascadedTasks.map(normalizeTask),
        cascadeNotification: null,
      };
    }),

  dismissCascadeNotification: () => set({ cascadeNotification: null }),
}));
