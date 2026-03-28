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
} from "@/lib/scheduling";

interface DependencyMutationResult {
  ok: boolean;
  error?: string;
}

interface ScheduleState {
  tasks: Task[];
  people: Person[];
  dependencies: Dependency[];
  sections: Section[];
  cascadeNotification: { message: string; affectedIds: string[] } | null;

  setScheduleData: (
    tasks: Task[],
    sections: Section[],
    dependencies: Dependency[],
    people: Person[],
  ) => void;

  addTask: (task: Task) => void;
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
): { message: string; affectedIds: string[] } | null => {
  if (affectedIds.length === 0) return null;
  return {
    message: `Cascade: ${sourceTaskName} -> ${affectedIds.length} task${affectedIds.length > 1 ? "s" : ""} shifted.`,
    affectedIds,
  };
};

export const useScheduleStore = create<ScheduleState>((set, get) => ({
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

  updateTask: (id, updates) => {
    const state = get();
    const tasks = state.tasks.map((t) => {
      if (t.id !== id) return t;
      const updated = { ...t, ...updates };

      if ("taskType" in updates && updates.taskType) {
        updated.userGroup = userGroupFromTaskType(updated.taskType);
      }

      const hasStartDate = Boolean(updated.startDate);
      const hasEndDate = Boolean(updated.endDate);
      if ("startDate" in updates && !("endDate" in updates)) {
        updated.endDate = hasStartDate
          ? recalcEndDate(updated.startDate, updated.duration)
          : "";
      } else if ("endDate" in updates && !("startDate" in updates)) {
        updated.duration =
          hasStartDate && hasEndDate
            ? recalcDuration(updated.startDate, updated.endDate)
            : 0;
      } else if ("duration" in updates && !("endDate" in updates)) {
        updated.endDate = hasStartDate
          ? recalcEndDate(updated.startDate, updated.duration)
          : "";
      }
      return updated;
    });

    const result = cascadeDependencies(tasks, state.dependencies, id);
    let finalTasks = result.updatedTasks.map(normalizeTask);
    const affectedIds = [...result.affectedIds];

    if ("status" in updates && updates.status === "Delayed") {
      const cascadeDelayed = (taskId: string, visited: Set<string>) => {
        const succs = state.dependencies.filter(
          (d) => d.predecessorId === taskId,
        );
        for (const dep of succs) {
          if (visited.has(dep.successorId)) continue;
          visited.add(dep.successorId);
          finalTasks = finalTasks.map((t) => {
            if (t.id === dep.successorId && t.status !== "Completed") {
              if (!affectedIds.includes(t.id)) affectedIds.push(t.id);
              return { ...t, status: "Delayed" as TaskStatus };
            }
            return t;
          });
          cascadeDelayed(dep.successorId, visited);
        }
      };
      cascadeDelayed(id, new Set([id]));
    }

    const notification =
      affectedIds.length > 0
        ? {
            message: `Cascade: ${result.sourceTaskName} -> ${affectedIds.length} task${affectedIds.length > 1 ? "s" : ""} affected.`,
            affectedIds,
          }
        : null;

    set({ tasks: finalTasks, cascadeNotification: notification });
  },

  deleteTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
      dependencies: state.dependencies.filter(
        (d) => d.predecessorId !== id && d.successorId !== id,
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
      people: state.people.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),
  removePerson: (id) =>
    set((state) => ({
      people: state.people.filter((p) => p.id !== id),
      tasks: state.tasks.map((t) => ({
        ...t,
        assignedTo: t.assignedTo.filter((assignedId) => assignedId !== id),
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

    const newDeps = [...state.dependencies, normalizedDep];
    const result = cascadeDependencies(state.tasks, newDeps, normalizedDep.predecessorId);

    set({
      dependencies: newDeps,
      tasks: result.updatedTasks.map(normalizeTask),
      cascadeNotification: dependencyShiftNotification(
        result.sourceTaskName,
        result.affectedIds,
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
    );

    set({
      dependencies: updatedDependencies,
      tasks: result.updatedTasks.map(normalizeTask),
      cascadeNotification: dependencyShiftNotification(
        result.sourceTaskName,
        result.affectedIds,
      ),
    });

    return { ok: true };
  },

  removeDependency: (id) =>
    set((state) => ({
      dependencies: state.dependencies.filter((d) => d.id !== id),
    })),

  dismissCascadeNotification: () => set({ cascadeNotification: null }),
}));
